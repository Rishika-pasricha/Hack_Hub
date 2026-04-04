const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const WORKER_SCRIPT_PATH = path.resolve(__dirname, '..', 'ml', 'waste_predictor_worker.py');
const PREDICTION_TIMEOUT_MS = 10000;
const MAX_STDERR_LOG_CHARS = 4000;

let workerProcess = null;
let stdoutBuffer = '';
let stderrBuffer = '';
let requestCounter = 0;
const pendingRequests = new Map();

function resolveExistingPath(candidates, label) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`${label} not found. Checked: ${candidates.join(', ')}`);
}

function resolveModelPath() {
  return resolveExistingPath(
    [
      process.env.WASTE_MODEL_PATH || '',
      path.resolve(__dirname, '..', '..', 'waste_classifier.h5'),
      path.resolve(__dirname, '..', 'waste_classifier.h5')
    ].filter(Boolean),
    'Waste model file'
  );
}

function resolveClassNamesPath() {
  return resolveExistingPath(
    [
      process.env.WASTE_CLASS_NAMES_PATH || '',
      path.resolve(__dirname, '..', '..', 'class_names.json'),
      path.resolve(__dirname, '..', 'class_names.json')
    ].filter(Boolean),
    'Class names file'
  );
}

function buildWorkerEnv() {
  const modelPath = resolveModelPath();
  const classNamesPath = resolveClassNamesPath();

  return {
    ...process.env,
    WASTE_MODEL_PATH: modelPath,
    WASTE_CLASS_NAMES_PATH: classNamesPath
  };
}

function rejectAllPending(message) {
  for (const [, pending] of pendingRequests.entries()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error(message));
  }
  pendingRequests.clear();
}

function handleWorkerMessage(message) {
  if (message.type === 'ready') {
    return;
  }

  if (message.type === 'startup_error') {
    rejectAllPending(`Waste predictor startup failed: ${message.error || 'unknown error'}`);
    return;
  }

  const requestId = String(message.id || '');
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    return;
  }

  clearTimeout(pending.timeout);
  pendingRequests.delete(requestId);

  if (message.type === 'error') {
    pending.reject(new Error(message.error || 'Prediction failed'));
    return;
  }

  if (message.type === 'result') {
    pending.resolve({
      label: String(message.label || ''),
      confidence: Number(message.confidence || 0),
      probabilities: Array.isArray(message.probabilities)
        ? message.probabilities.map((item) => ({
            label: String(item.label || ''),
            score: Number(item.score || 0)
          }))
        : []
    });
  }
}

function ensureWorker() {
  if (workerProcess && !workerProcess.killed) {
    return workerProcess;
  }

  let workerEnv;
  try {
    workerEnv = buildWorkerEnv();
  } catch (err) {
    rejectAllPending(`Waste predictor config error: ${err.message}`);
    throw err;
  }

  const pythonCommand = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'py' : 'python');
  workerProcess = spawn(pythonCommand, [WORKER_SCRIPT_PATH], {
    env: workerEnv,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  stdoutBuffer = '';
  stderrBuffer = '';

  workerProcess.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();

    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

      if (line) {
        try {
          handleWorkerMessage(JSON.parse(line));
        } catch (err) {
          // Ignore malformed lines from Python logs.
        }
      }

      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  workerProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) {
      stderrBuffer = `${stderrBuffer}\n${text}`.slice(-MAX_STDERR_LOG_CHARS);
      console.error('[wastePredictor]', text);
    }
  });

  workerProcess.stdin.on('error', (err) => {
    const details = stderrBuffer ? ` | stderr: ${stderrBuffer}` : '';
    rejectAllPending(`Waste predictor stdin error: ${err.message}${details}`);
  });

  workerProcess.on('exit', (code) => {
    workerProcess = null;
    const details = stderrBuffer ? ` | stderr: ${stderrBuffer}` : '';
    rejectAllPending(`Waste predictor worker exited with code ${code}${details}`);
  });

  workerProcess.on('error', (err) => {
    workerProcess = null;
    const details = stderrBuffer ? ` | stderr: ${stderrBuffer}` : '';
    rejectAllPending(`Waste predictor worker error: ${err.message}${details}`);
  });

  return workerProcess;
}

function predictWasteFromImage(imageDataUrl) {
  const normalizedImage = String(imageDataUrl || '').trim();
  if (!normalizedImage.startsWith('data:image/')) {
    return Promise.reject(new Error('Invalid image payload'));
  }

  let worker;
  try {
    worker = ensureWorker();
  } catch (err) {
    return Promise.reject(new Error(`Failed to start waste predictor: ${err.message}`));
  }

  if (!worker.stdin || worker.stdin.destroyed || worker.killed || worker.exitCode !== null) {
    return Promise.reject(new Error('Waste predictor worker is unavailable'));
  }

  const requestId = `${Date.now()}-${requestCounter++}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Prediction timed out'));
    }, PREDICTION_TIMEOUT_MS);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    const payload = {
      id: requestId,
      imageDataUrl: normalizedImage
    };

    worker.stdin.write(`${JSON.stringify(payload)}\n`, (err) => {
      if (!err) {
        return;
      }

      clearTimeout(timeout);
      pendingRequests.delete(requestId);
      reject(new Error(`Failed to send image to predictor: ${err.message}`));
    });
  });
}

module.exports = {
  predictWasteFromImage
};
