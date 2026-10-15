const fs = require('fs');
const path = require('path');

// launchd appends both services' output to *.log files and never rotates them.
// Copy-then-truncate keeps launchd's open file handle valid: it writes with
// O_APPEND, so after truncation it carries on from the start of the file.
// Keeps `keep` old copies: backend.log.1 (newest) ... backend.log.3.
const rotateLogs = (dir, { maxBytes = 10 * 1024 * 1024, keep = 3 } = {}) => {
  const rotated = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.log')) continue;
    const file = path.join(dir, name);
    if (fs.statSync(file).size < maxBytes) continue;
    for (let i = keep - 1; i >= 1; i -= 1) {
      if (fs.existsSync(`${file}.${i}`)) {
        fs.renameSync(`${file}.${i}`, `${file}.${i + 1}`);
      }
    }
    fs.copyFileSync(file, `${file}.1`);
    fs.truncateSync(file, 0);
    rotated.push(name);
  }
  return rotated;
};

module.exports = { rotateLogs };
