const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const WORKER_SCRIPT_PATH = path.resolve(__dirname, '..', 'ml', 'waste_predictor_worker.py');
const REQUIREMENTS_PATH = path.resolve(__dirname, '..', 'requirements-ml.txt');
const BACKEND_DIR = path.resolve(__dirname, '..');
const PREDICTION_TIMEOUT_MS = 10000;
const MAX_STDERR_LOG_CHARS = 4000;

let workerProcess = null;
let stdoutBuffer = '';
let stderrBuffer = '';
let workerReadyPromise = null;
let resolveWorkerReady = null;
let rejectWorkerReady = null;
let autoInstallAttempted = false;
let requestCounter = 0;
const pendingRequests = new Map();

function resetWorkerReadyState() {
  workerReadyPromise = null;
  resolveWorkerReady = null;
  rejectWorkerReady = null;
}

function initWorkerReadyPromise() {
  workerReadyPromise = new Promise((resolve, reject) => {
    resolveWorkerReady = resolve;
    rejectWorkerReady = reject;
  });
}

function markWorkerReady() {
  if (resolveWorkerReady) {
    resolveWorkerReady();
  }
  resolveWorkerReady = null;
  rejectWorkerReady = null;
}

function markWorkerFailed(message) {
  if (rejectWorkerReady) {
    rejectWorkerReady(new Error(message));
  }
  resolveWorkerReady = null;
  rejectWorkerReady = null;
}

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

function getPythonCommand() {
  return process.env.PYTHON_BIN || 'python';
}

function maybeInstallMlDependenciesFromError(errorText) {
  if (autoInstallAttempted || !fs.existsSync(REQUIREMENTS_PATH)) {
    return false;
  }

  const text = String(errorText || '');
  const missingModuleMatch = text.match(/No module named ['\"]([^'\"]+)['\"]/i);
  const missingModule = String(missingModuleMatch?.[1] || '').toLowerCase();
  const eligibleMissingModule = ['numpy', 'pil', 'tensorflow', 'keras'].includes(missingModule);

  if (!eligibleMissingModule) {
    return false;
  }

  const pythonCommand = getPythonCommand();
  const installResult = spawnSync(
    pythonCommand,
    ['-m', 'pip', 'install', '--no-cache-dir', '-r', REQUIREMENTS_PATH],
    {
      cwd: BACKEND_DIR,
      encoding: 'utf-8'
    }
  );

  if (installResult.error) {
    throw new Error(`Automatic ML dependency install failed: ${installResult.error.message}`);
  }

  if (installResult.status !== 0) {
    const output = [installResult.stdout, installResult.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`Automatic ML dependency install failed with exit code ${installResult.status}. ${output}`);
  }

  autoInstallAttempted = true;

  return true;
}

function handleWorkerMessage(message) {
  if (message.type === 'ready') {
    markWorkerReady();
    return;
  }

  if (message.type === 'startup_error') {
    const startupMessage = `Waste predictor startup failed: ${message.error || 'unknown error'}`;
    markWorkerFailed(startupMessage);
    rejectAllPending(startupMessage);

    if (workerProcess && !workerProcess.killed) {
      workerProcess.kill();
    }

    workerProcess = null;
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

  const pythonCommand = getPythonCommand();
  initWorkerReadyPromise();

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
    const message = `Waste predictor worker exited with code ${code}${details}`;
    markWorkerFailed(message);
    rejectAllPending(message);
    resetWorkerReadyState();
  });

  workerProcess.on('error', (err) => {
    workerProcess = null;
    const details = stderrBuffer ? ` | stderr: ${stderrBuffer}` : '';
    const message = `Waste predictor worker error: ${err.message}${details}`;
    markWorkerFailed(message);
    rejectAllPending(message);
    resetWorkerReadyState();
  });

  return workerProcess;
}

async function ensureWorkerReadyWithRecovery() {
  const worker = ensureWorker();

  if (!workerReadyPromise) {
    return worker;
  }

  try {
    await workerReadyPromise;
    return worker;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err || 'Unknown worker startup failure');
    const installed = maybeInstallMlDependenciesFromError(errorMessage);

    if (!installed) {
      throw err instanceof Error ? err : new Error(errorMessage);
    }

    const restartedWorker = ensureWorker();
    if (workerReadyPromise) {
      await workerReadyPromise;
    }

    return restartedWorker;
  }
}

async function predictWasteFromImage(imageDataUrl) {
  const normalizedImage = String(imageDataUrl || '').trim();
  if (!normalizedImage.startsWith('data:image/')) {
    throw new Error('Invalid image payload');
  }

  const worker = await ensureWorkerReadyWithRecovery();

  if (!worker.stdin || worker.stdin.destroyed || worker.killed || worker.exitCode !== null) {
    throw new Error('Waste predictor worker is unavailable');
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
