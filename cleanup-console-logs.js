import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const consoleLogs = /console\.(log|error|warn|info|debug)\([^)]*\);?\n?/g;

function removeConsoleLogs(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = content.replace(consoleLogs, '');

    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`✅ Cleaned: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir, extensions) {
  let count = 0;

  if (!fs.existsSync(dir)) {
    console.warn(`⚠️ Directory not found: ${dir}`);
    return count;
  }

  const files = fs.readdirSync(dir, { recursive: true });

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      if (removeConsoleLogs(filePath)) {
        count++;
      }
    }
  });

  return count;
}

console.log('🧹 Starting console.log removal process...\n');

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

console.log('📁 Processing backend controllers...');
let total = processDirectory(path.join(__dirname, 'backend', 'controllers'), extensions);

console.log('\n📁 Processing backend middleware...');
total += processDirectory(path.join(__dirname, 'backend', 'middleware'), extensions);

console.log('\n📁 Processing backend routes...');
total += processDirectory(path.join(__dirname, 'backend', 'routes'), extensions);

console.log('\n📁 Processing backend config...');
total += processDirectory(path.join(__dirname, 'backend', 'config'), extensions);

console.log('\n📁 Processing backend utils...');
total += processDirectory(path.join(__dirname, 'backend', 'utils'), extensions);

console.log('\n📁 Processing frontend components...');
total += processDirectory(path.join(__dirname, 'components'), extensions);

console.log(`\n✨ Console.log removal complete! (${total} files cleaned)`);
