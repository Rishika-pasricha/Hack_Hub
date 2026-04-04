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

function getPythonCandidates() {
  const candidates = [];

  if (process.env.PYTHON_BIN) {
    candidates.push(process.env.PYTHON_BIN);
  }

  if (process.platform === 'win32') {
    candidates.push('python', 'py');
  } else {
    candidates.push('python', 'python3');
  }

  return [...new Set(candidates)];
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

  const result = spawnSync(
    pythonCommand,
    ['-m', 'pip', 'install', '--no-cache-dir', '-r', REQUIREMENTS_PATH],
    {
      cwd: BACKEND_DIR,
      encoding: 'utf-8',
      stdio: 'inherit'
    }
  );

  if (!result.error && result.status === 0) {
    console.log(`[installMlDeps] Installed ML dependencies using ${pythonCommand}.`);
    process.exit(0);
  }

  const details = [result.error?.message].filter(Boolean).join('\n').trim();
  lastFailure = `Command '${pythonCommand} -m pip install -r requirements-ml.txt' failed. ${details}`;
}

const finalMessage = `[installMlDeps] ${lastFailure || 'No Python command succeeded.'}`;

if (shouldFailBuild) {
  console.error(finalMessage);
  process.exit(1);
}

console.warn(`${finalMessage} Continuing build; runtime auto-install will handle missing ML deps.`);
process.exit(0);
