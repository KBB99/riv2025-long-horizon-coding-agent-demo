#!/usr/bin/env node
/**
 * backend-verify.cjs - Verification helper for non-frontend tests
 *
 * Runs a shell command, captures exit code + stdout/stderr, and writes
 * verification artifacts in the same directory structure that the security
 * hook expects (parallel to playwright-test.cjs for backend/shared/infra tests).
 *
 * Usage:
 *   node backend-verify.cjs --test-id <ID> --output-dir <DIR> --command "<CMD>"
 *
 * Examples:
 *   node backend-verify.cjs --test-id shared-schemas-compile --output-dir screenshots/issue-5 --command "cd shared && npx tsc --noEmit"
 *   node backend-verify.cjs --test-id cdk-synth --output-dir screenshots/issue-5 --command "cd infrastructure && npx cdk synth"
 *   node backend-verify.cjs --test-id lambda-handler-test --output-dir screenshots/issue-5 --command "cd backend && npm test"
 *   node backend-verify.cjs --test-id api-health --output-dir screenshots/issue-5 --command "curl -s https://api.example.com/health"
 *
 * Output files:
 *   <output-dir>/<test-id>-result.txt   Verification result (sentinel, timestamp, command, exit code, stdout, stderr, PASS/FAIL)
 *   <output-dir>/<test-id>-console.txt  Console output (NO_CONSOLE_ERRORS or ERRORS:<stderr>)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Allowlisted command prefixes
const ALLOWED_PREFIXES = [
  'cd ',
  'npx ',
  'npm ',
  'curl ',
  'aws ',
  'tsc ',
  'node ',
  'jq ',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    testId: null,
    outputDir: null,
    command: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--test-id':
        config.testId = args[++i];
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--command':
        config.command = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
backend-verify.cjs - Verification helper for non-frontend tests

Required arguments:
  --test-id <ID>       Test identifier for output filenames
  --output-dir <DIR>   Directory for output files
  --command "<CMD>"    Shell command to execute

Output files:
  <output-dir>/<test-id>-result.txt    Verification result with sentinel
  <output-dir>/<test-id>-console.txt   Console output (NO_CONSOLE_ERRORS or ERRORS:...)

Allowed command prefixes: ${ALLOWED_PREFIXES.map((p) => p.trim()).join(', ')}
`);
}

function validate(config) {
  const errors = [];

  if (!config.testId) errors.push('--test-id is required');
  if (!config.outputDir) errors.push('--output-dir is required');
  if (!config.command) errors.push('--command is required');

  // Validate output directory - prevent path traversal
  if (config.outputDir) {
    const normalized = path.normalize(config.outputDir);
    if (normalized.includes('..')) {
      errors.push('output-dir cannot contain path traversal (..)');
    }
  }

  // Validate command against allowlist
  if (config.command) {
    // Split on && and ; to check each sub-command
    const subCommands = config.command
      .split(/\s*(?:&&|;)\s*/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (const sub of subCommands) {
      const isAllowed = ALLOWED_PREFIXES.some((prefix) =>
        sub.startsWith(prefix)
      );
      if (!isAllowed) {
        errors.push(
          `Command "${sub}" not allowed. Must start with one of: ${ALLOWED_PREFIXES.map((p) => p.trim()).join(', ')}`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

function run() {
  const config = parseArgs();
  validate(config);

  // Ensure output directory exists
  fs.mkdirSync(config.outputDir, { recursive: true });

  const timestamp = new Date().toISOString();
  let exitCode = 0;
  let stdout = '';
  let stderr = '';

  try {
    const output = execSync(config.command, {
      encoding: 'utf-8',
      timeout: 60000, // 60 second timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    stdout = output || '';
  } catch (err) {
    exitCode = err.status || 1;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }

  const passed = exitCode === 0;

  // Write result file with sentinel
  const resultPath = path.join(
    config.outputDir,
    `${config.testId}-result.txt`
  );
  const resultContent = [
    `VERIFIED_BY: backend-verify.cjs`,
    `TIMESTAMP: ${timestamp}`,
    `COMMAND: ${config.command}`,
    `EXIT_CODE: ${exitCode}`,
    `RESULT: ${passed ? 'PASS' : 'FAIL'}`,
    ``,
    `--- STDOUT ---`,
    stdout,
    `--- STDERR ---`,
    stderr,
  ].join('\n');

  fs.writeFileSync(resultPath, resultContent);
  console.log(`Result saved: ${resultPath}`);

  // Write console file (parallel to playwright-test.cjs format)
  const consolePath = path.join(
    config.outputDir,
    `${config.testId}-console.txt`
  );
  const consoleContent =
    stderr && stderr.trim()
      ? `ERRORS:\n${stderr}`
      : 'NO_CONSOLE_ERRORS';
  fs.writeFileSync(consolePath, consoleContent);
  console.log(`Console log saved: ${consolePath}`);

  // Print summary
  if (passed) {
    console.log(`\nRESULT: PASS (exit code 0)`);
  } else {
    console.log(`\nRESULT: FAIL (exit code ${exitCode})`);
    if (stderr) {
      console.log(`\nStderr:\n${stderr}`);
    }
  }
}

run();
