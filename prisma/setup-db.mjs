import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

if (process.env.VERCEL === '1') {
  console.log('Detected Vercel environment. Configuring PostgreSQL...');
  // Force PostgreSQL
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider  = "postgresql"');
  schemaContent = schemaContent.replace(/url\s*=\s*"file:\.\/dev\.db"/, 'url       = env("DATABASE_URL")');
  // Uncomment directUrl if it was commented out
  schemaContent = schemaContent.replace(/\/\/ directUrl = env\("DIRECT_URL"\)/, 'directUrl = env("DIRECT_URL")');
} else {
  console.log('Local environment detected. Configuring SQLite...');
  // Force SQLite
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  schemaContent = schemaContent.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url      = "file:./dev.db"');
  // Comment out directUrl as SQLite doesn't support it
  schemaContent = schemaContent.replace(/directUrl\s*=\s*env\("DIRECT_URL"\)/, '// directUrl = env("DIRECT_URL")');
}

fs.writeFileSync(schemaPath, schemaContent);
console.log('Prisma schema updated successfully.');
