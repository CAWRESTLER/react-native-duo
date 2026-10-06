'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const syntaxCheckSource = path.join(
  __dirname,
  '__fixtures__',
  'camera-lifecycle.cpp'
);

function canCompile(cxx) {
  try {
    execFileSync(
      cxx,
      [
        '-std=c++17',
        '-Wall',
        '-Wextra',
        '-Werror',
        '-I',
        projectRoot,
        syntaxCheckSource,
        '-fsyntax-only',
      ],
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

/** Pick a C++17 compiler that can parse the portable native policy headers. */
function resolveCxx() {
  const candidates = [
    process.env.CXX,
    process.platform === 'linux' ? 'g++' : null,
    'c++',
    'g++',
    'clang++',
  ].filter(Boolean);

  const seen = new Set();
  for (const cxx of candidates) {
    if (seen.has(cxx)) continue;
    seen.add(cxx);
    if (canCompile(cxx)) return cxx;
  }

  throw new Error(
    'No working C++17 compiler found for native policy tests. Install g++ (libstdc++-dev) or set CXX to a working compiler.'
  );
}

module.exports = { resolveCxx };

if (require.main === module) {
  process.stdout.write(`${resolveCxx()}\n`);
}
