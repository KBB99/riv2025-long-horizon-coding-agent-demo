const tests = require('./tests.json').tests;
const fs = require('fs');
const dir = 'screenshots/issue-30';
let allOk = true;
for (const t of tests) {
  const hasResult = fs.existsSync(dir + '/' + t.id + '-result.txt');
  const hasConsole = fs.existsSync(dir + '/' + t.id + '-console.txt');
  const pngFiles = fs.readdirSync(dir).filter(f => f.startsWith(t.id + '-') && f.endsWith('.png'));
  const hasPng = pngFiles.length > 0;
  const ok = hasResult || (hasConsole && hasPng);
  if (!ok) { console.log('MISSING:', t.id, JSON.stringify({hasResult, hasConsole, hasPng})); allOk = false; }
}
if (allOk) console.log('ALL ' + tests.length + ' TESTS HAVE VERIFICATION FILES');
else console.log('Some tests missing verification files');
console.log('Total tests:', tests.length);
