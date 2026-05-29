// Netlify build script — runs server-side, injects env vars, outputs to /dist
// Environment variables set in Netlify dashboard (never in repo):
//   GCAL_API_KEY     — your Google API key
//   GCAL_CLIENT_ID   — your OAuth client ID

const fs   = require('fs');
const path = require('path');

const apiKey   = process.env.GCAL_API_KEY   || '';
const clientId = process.env.GCAL_CLIENT_ID || '';

if (!apiKey)   console.warn('WARNING: GCAL_API_KEY not set');
if (!clientId) console.warn('WARNING: GCAL_CLIENT_ID not set');

// Copy all site files to /dist
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

const files = fs.readdirSync('.').filter(f =>
  ['.html','.css','.js','.ico','.png','.svg'].includes(path.extname(f)) &&
  f !== 'build.js'
);

files.forEach(f => fs.copyFileSync(f, path.join('dist', f)));

// Write config.js into dist with the real credentials injected
const config = `window.SITE_CONFIG = {
  apiKey:   '${apiKey}',
  clientId: '${clientId}',
  calendars: [
    { id: 'en.usa#holiday@group.v.calendar.google.com',                                                  cat: 'holiday'  },
    { id: '9e3d406ff577e84f8520707b3d6fde4f0231d9af3bfa3d540139a70e801dbec2@group.calendar.google.com', cat: 'workann'  },
    { id: '382b2aa86827b768761c16ce3b5bec6323f1d9f62fed78aaf107bf83c537a410@group.calendar.google.com', cat: 'cnend'    },
    { id: '3e2fc9cd2ded39150182128a50e16d2d3ac65d7deabdaa411c2f497446d002fb@group.calendar.google.com', cat: 'birthday' },
  ],
};`;

fs.writeFileSync(path.join('dist', 'config.js'), config);
console.log('Build complete — config.js written with injected credentials');
