const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REQUIREMENTS_PATH = path.resolve(BACKEND_DIR, 'requirements-ml.txt');

if (!fs.existsSync(REQUIREMENTS_PATH)) {
  console.log('[installMlDeps] requirements-ml.txt not found; skipping ML dependency install.');
  process.exit(0);
}

const shouldFailBuild = process.env.FAIL_ON_ML_INSTALL === '1';

function writeOutput(output, channel = 'stdout') {
  const text = String(output || '');
  if (!text.trim()) {
    return;
  }

  if (channel === 'stderr') {
    process.stderr.write(text);
    return;
  }

  process.stdout.write(text);
}

function getPythonCandidates() {
  const candidates = [];

  if (process.env.PYTHON_BIN) {
    candidates.push(process.env.PYTHON_BIN);
  }

  if (process.platform === 'win32') {
    candidates.push('python', 'py');
  } else {
    candidates.push('python3.12', 'python3.11', 'python3.10', 'python3', 'python');
  }

  return [...new Set(candidates)];
}

function runPipInstall(pythonCommand, args) {
  const result = spawnSync(
    pythonCommand,
    ['-m', 'pip', 'install', '--no-cache-dir', ...args],
    {
      cwd: BACKEND_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    }
  );

  writeOutput(result.stdout, 'stdout');
  writeOutput(result.stderr, 'stderr');

  return result;
}

function installWithFallbacks(pythonCommand) {
  const primary = runPipInstall(pythonCommand, ['-r', REQUIREMENTS_PATH]);
  if (!primary.error && primary.status === 0) {
    return { ok: true, details: '' };
  }

  const primaryOutput = [primary.error?.message, primary.stdout, primary.stderr]
    .filter(Boolean)
    .join('\n')
    .trim();

  const tfMissing = /No matching distribution found for\s+(?:tensorflow(?:-cpu)?|tf-nightly(?:-cpu)?)/i.test(primaryOutput);
  if (!tfMissing) {
    return {
      ok: false,
      details: `Command '${pythonCommand} -m pip install -r requirements-ml.txt' failed. ${primaryOutput}`
    };
  }

  const fallbackAttempts = [
    ['tensorflow-cpu==2.21.0', 'numpy', 'Pillow'],
    ['tensorflow-cpu', 'numpy', 'Pillow'],
    ['tf-nightly-cpu', 'numpy', 'Pillow']
  ];

  for (const packages of fallbackAttempts) {
    const fallback = runPipInstall(pythonCommand, packages);
    if (!fallback.error && fallback.status === 0) {
      return { ok: true, details: '' };
    }
  }

  return {
    ok: false,
    details: `TensorFlow install fallback failed for ${pythonCommand}. ${primaryOutput}`
  };
}

let lastFailure = '';
for (const pythonCommand of getPythonCandidates()) {
  const probe = spawnSync(pythonCommand, ['--version'], {
    cwd: BACKEND_DIR,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  if (probe.error || probe.status !== 0) {
    const probeDetails = [probe.error?.message, probe.stdout, probe.stderr].filter(Boolean).join('\n').trim();
    lastFailure = `Python command '${pythonCommand}' unavailable. ${probeDetails}`;
    continue;
  }

  const installResult = installWithFallbacks(pythonCommand);
  if (installResult.ok) {
    console.log(`[installMlDeps] Installed ML dependencies using ${pythonCommand}.`);
    process.exit(0);
  }

  lastFailure = installResult.details;
}

const finalMessage = `[installMlDeps] ${lastFailure || 'No Python command succeeded.'}`;

if (shouldFailBuild) {
  console.error(finalMessage);
  process.exit(1);
}

console.warn(`${finalMessage} Continuing build; runtime auto-install will handle missing ML deps.`);
process.exit(0);
