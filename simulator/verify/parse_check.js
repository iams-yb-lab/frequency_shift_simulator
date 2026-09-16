// Layer 1: parse every inline <script> block of simulator.html without executing it.
const fs = require('fs');
const path = process.argv[2] || require('path').join(__dirname, '..', 'simulator.html');
const html = fs.readFileSync(path, 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, i = 0, ok = 0;
while ((m = re.exec(html))) {
  i++;
  const src = m[1];
  const line = html.slice(0, m.index).split('\n').length;
  try {
    new Function(src);
    ok++;
    console.log(`block ${i} (line ${line}, ${src.length} chars): OK`);
  } catch (e) {
    console.log(`block ${i} (line ${line}): PARSE ERROR ${e.message}`);
    // locate: bisect by trying prefixes is unreliable; print message and first line of stack
    process.exitCode = 1;
  }
}
console.log(`${ok}/${i} inline script blocks parse`);
