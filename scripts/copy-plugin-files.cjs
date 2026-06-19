const fse = require('fs-extra');
const path = require('path');

const src = path.join(__dirname, '..', 'src');
const dist = path.join(__dirname, '..', 'dist', 'plugin');

fse.ensureDirSync(dist);
fse.copyFileSync(path.join(src, 'plugin', 'ui.html'), path.join(dist, 'ui.html'));
fse.copyFileSync(path.join(src, 'plugin', 'manifest.json'), path.join(dist, 'manifest.json'));