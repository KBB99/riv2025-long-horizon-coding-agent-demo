#!/usr/bin/env node
/**
 * Backend verification helper
 * Usage: node backend-verify.cjs --test-id TEST_ID --output-dir DIR --command "CMD"
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const testId = getArg('test-id') || 'test';
  const outputDir = getArg('output-dir') || 'screenshots';
  const command = getArg('command') || 'echo "no command"';

  fs.mkdirSync(outputDir, { recursive: true });

  const resultPath = path.join(outputDir, `${testId}-result.txt`);
  const consolePath = path.join(outputDir, `${testId}-console.txt`);

  try {
    const output = execSync(command, {
      encoding: 'utf8',
      timeout: 60000,
      cwd: process.cwd(),
      env: { ...process.env }
    });

    fs.writeFileSync(consolePath, output);
    fs.writeFileSync(resultPath, `RESULT: PASS\n\nCommand: ${command}\n\nOutput:\n${output}`);
    console.log(`PASS: ${testId}`);
  } catch (err) {
    const output = (err.stdout || '') + '\n' + (err.stderr || '');
    fs.writeFileSync(consolePath, output);
    fs.writeFileSync(resultPath, `RESULT: FAIL\n\nCommand: ${command}\n\nExit code: ${err.status}\n\nOutput:\n${output}`);
    console.log(`FAIL: ${testId}`);
  }
}

main();
