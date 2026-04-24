#!/usr/bin/env node

/**
 * Quick Integrity Check Script
 * Verifies all controllers, models, and routes are properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Running Integrity Check...\n');

// Check 1: Controllers
const controllerDir = path.join(__dirname, 'controllers');
const controllers = fs.readdirSync(controllerDir).filter(f => f.endsWith('.js'));
console.log(`✅ Controllers: ${controllers.length} files`);
controllers.forEach(c => console.log(`   - ${c}`));

// Check 2: Models
const modelDir = path.join(__dirname, 'models');
const models = fs.readdirSync(modelDir).filter(f => f.endsWith('.js') && f !== 'index.js');
console.log(`\n✅ Models: ${models.length} files`);
models.forEach(m => console.log(`   - ${m}`));

// Check 3: Routes
const routeDir = path.join(__dirname, 'routes');
const routes = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
console.log(`\n✅ Routes: ${routes.length} files`);
routes.forEach(r => console.log(`   - ${r}`));

// Check 4: No MySQL references in controllers
console.log('\n🔍 Checking for MySQL references...');
let mysqlFound = false;

controllers.forEach(controller => {
  const filePath = path.join(controllerDir, controller);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('mysql') || content.includes('db.query') || content.includes('getConnection()')) {
    console.log(`   ❌ MySQL reference found in ${controller}`);
    mysqlFound = true;
  }
});

if (!mysqlFound) {
  console.log('   ✅ No MySQL references found in controllers');
}

// Check 5: All controllers import from models
console.log('\n🔍 Checking model imports...');
let importIssues = false;

controllers.forEach(controller => {
  const filePath = path.join(controllerDir, controller);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip authController (imports User directly, which is fine)
  if (controller === 'authController.js') {
    if (content.includes("from '../models/User.js'")) {
      return; // OK
    }
  }
  
  if (!content.includes("from '../models/index.js'") && !content.includes("from '../models/User.js'")) {
    console.log(`   ⚠️  ${controller} might not be importing models`);
    importIssues = true;
  }
});

if (!importIssues) {
  console.log('   ✅ All controllers properly import models');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 INTEGRITY CHECK SUMMARY');
console.log('='.repeat(50));
console.log(`Controllers: ${controllers.length}`);
console.log(`Models: ${models.length}`);
console.log(`Routes: ${routes.length}`);
console.log(`MySQL References: ${mysqlFound ? '❌ FOUND' : '✅ NONE'}`);
console.log(`Import Issues: ${importIssues ? '⚠️  FOUND' : '✅ NONE'}`);
console.log('\n' + (mysqlFound || importIssues ? '⚠️  Issues found - review needed' : '🎉 All checks passed!'));
