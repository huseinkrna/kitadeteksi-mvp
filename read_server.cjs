const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf-8').split('\n');
const idx = lines.findIndex(l => l.includes('app.post("/api/auth/register"'));
if(idx > -1) {
  console.log(lines.slice(idx, idx+60).join('\n'));
} else {
  console.log("not found");
}
