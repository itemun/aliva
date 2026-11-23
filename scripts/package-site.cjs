const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
fs.copyFileSync(path.join(root, 'aliva-concept-function.html'), path.join(root, 'index.html'));
console.log('Built index.html');
