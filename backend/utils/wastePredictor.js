const path = require('path');
const { spawn } = require('child_process');

const MODEL_PATH = path.resolve(__dirname, '..', '..', 'waste_classifier.h5');
const CLASS_NAMES_PATH = path.resolve(__dirname, '..', '..', 'class_names.json');
const WORKER_SCRIPT_PATH = path.resolve(__dirname, '..', 'ml', 'waste_predictor_worker.py');
const PREDICTION_TIMEOUT_MS = 10000;

let workerProcess = null;
let stdoutBuffer = '';
let requestCounter = 0;
const pendingRequests = new Map();

function buildWorkerEnv() {
  return {
    ...process.env,
    WASTE_MODEL_PATH: MODEL_PATH,
    WASTE_CLASS_NAMES_PATH: CLASS_NAMES_PATH
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

  const pythonCommand = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'py' : 'python');
  workerProcess = spawn(pythonCommand, [WORKER_SCRIPT_PATH], {
    env: buildWorkerEnv(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  stdoutBuffer = '';

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
      console.error('[wastePredictor]', text);
    }
  });

  workerProcess.on('exit', (code) => {
    workerProcess = null;
    rejectAllPending(`Waste predictor worker exited with code ${code}`);
  });

  workerProcess.on('error', (err) => {
    workerProcess = null;
    rejectAllPending(`Waste predictor worker error: ${err.message}`);
  });

  return workerProcess;
}

function predictWasteFromImage(imageDataUrl) {
  const normalizedImage = String(imageDataUrl || '').trim();
  if (!normalizedImage.startsWith('data:image/')) {
    return Promise.reject(new Error('Invalid image payload'));
  }

  const worker = ensureWorker();
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

    try {
      worker.stdin.write(`${JSON.stringify(payload)}\n`);
    } catch (err) {
      clearTimeout(timeout);
      pendingRequests.delete(requestId);
      reject(new Error(`Failed to send image to predictor: ${err.message}`));
    }
  });
}

module.exports = {
  predictWasteFromImage
};
