#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Clearing cache and restarting development server...');

// Clear build cache
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
  console.log('Removing build directory...');
  fs.rmSync(buildPath, { recursive: true, force: true });
}

// Clear node_modules cache
console.log('Clearing node_modules cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
} catch (error) {
  console.log('npm cache clean failed, continuing...');
}

// Clear React Scripts cache
const reactScriptsCache = path.join(process.env.HOME || process.env.USERPROFILE, '.cache', 'react-scripts');
if (fs.existsSync(reactScriptsCache)) {
  console.log('Clearing React Scripts cache...');
  fs.rmSync(reactScriptsCache, { recursive: true, force: true });
}

console.log('✅ Cache cleared successfully!');
console.log('🔄 Please restart your development server with: npm start'); 