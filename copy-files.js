const fs = require('fs');
const path = require('path');

const filesToCopy = [
  'manifest.json',
  'popup.html',
  'index.html',
  'icon16.png'
];

const distDir = 'dist';

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy files
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
    console.log(`Copied ${file} to ${distDir}`);
  } else {
    console.warn(`File ${file} not found`);
  }
});

console.log('Static files copied successfully!');