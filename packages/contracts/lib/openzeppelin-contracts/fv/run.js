#!/usr/bin/env node

// USAGE:
//    node fv/run.js [CONFIG]* [--all]
// EXAMPLES:
//    node fv/run.js --all
//    node fv/run.js ERC721
//    node fv/run.js fv/specs/ERC721.conf

const glob = require('glob');
const fs = require('fs');
const pLimit = require('p-limit').default;
const { hideBin } = require('yargs/helpers');
const yargs = require('yargs/yargs');
const { execFile } = require('child_process');

const { argv } = yargs(hideBin(process.argv))
  .env('')
  .options({
    all: {
      type: 'boolean',
    },
    parallel: {
      alias: 'p',
      type: 'number',
      default: 4,
    },
    verbose: {
      alias: 'v',
      type: 'count',
      default: 0,
    },
  });

const pattern = 'fv/specs/*.conf';
const limit = pLimit(argv.parallel);

function resolveConfig(name) {
  const config = fs.existsSync(name) ? name : pattern.replace('*', name);
  if (config.includes('\0') || !config.endsWith('.conf')) {
    throw new Error(`Invalid spec path: ${name}`);
  }
  return config;
}

function proverUrl(stdout) {
  const match = stdout.match(/https:\/\/prover\.certora\.com\/output\/[a-z0-9]+\/[a-z0-9]+\?anonymousKey=[a-z0-9]+/);
  return match ? match[0] : undefined;
}

if (argv._.length == 0 && !argv.all) {
  console.error(`Warning: No specs requested. Did you forget to toggle '--all'?`);
  process.exitCode = 1;
} else {
  Promise.all(
    (argv.all ? glob.sync(pattern) : argv._.map(resolveConfig)).map(
      (conf, i, { length }) =>
        limit(
          () =>
            new Promise(resolve => {
              if (argv.verbose) console.log(`[${i + 1}/${length}] Running ${conf}`);
              execFile('certoraRun', [conf], (error, stdout, stderr) => {
                const match = proverUrl(stdout);
                if (error) {
                  console.error(`[ERR] ${conf} failed with:\n${stderr || stdout}`);
                  process.exitCode = 1;
                } else if (match) {
                  console.log(`${conf} - ${match}`);
                } else {
                  console.error(`[ERR] Could not parse stdout for ${conf}:\n${stdout}`);
                  process.exitCode = 1;
                }
                resolve();
              });
            }),
        ),
    ),
  );
}
