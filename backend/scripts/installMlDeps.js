const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REQUIREMENTS_PATH = path.resolve(BACKEND_DIR, 'requirements-ml.txt');

if (!fs.existsSync(REQUIREMENTS_PATH)) {
  console.log('[installMlDeps] requirements-ml.txt not found; skipping ML dependency install.');
  process.exit(0);
}

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
  const result = spawnSync(
    pythonCommand,
    ['-m', 'pip', 'install', '--no-cache-dir', '-r', REQUIREMENTS_PATH],
    {
      cwd: BACKEND_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    }
  );

  if (!result.error && result.status === 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    console.log(`[installMlDeps] Installed ML dependencies using ${pythonCommand}.`);
    process.exit(0);
  }

  const details = [result.error?.message, result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  lastFailure = `Command '${pythonCommand} -m pip install -r requirements-ml.txt' failed. ${details}`;
}

console.error(`[installMlDeps] ${lastFailure || 'No Python command succeeded.'}`);
process.exit(1);
