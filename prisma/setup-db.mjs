import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Determine database type to use
const isProduction = process.env.VERCEL === '1';
const dbTypeOverride = process.env.DB_TYPE; // 'sqlite' or 'postgres'

const usePostgres = dbTypeOverride === 'postgres' || (isProduction && dbTypeOverride !== 'sqlite');

if (usePostgres) {
  console.log('PostgreSQL configuration detected. Updating Prisma schema...');
  // Force PostgreSQL
  schemaContent = schemaContent.replace(/provider\s*=\s*"(sqlite|postgresql)"/, 'provider = "postgresql"');
  schemaContent = schemaContent.replace(/url\s*=\s*("(file:.\/dev.db)"|env\("DATABASE_URL"\))/, 'url = env("DATABASE_URL")');
  // Uncomment directUrl
  schemaContent = schemaContent.replace(/\/\/+\s*directUrl\s*=\s*env\("DIRECT_URL"\)/, 'directUrl = env("DIRECT_URL")');
} else {
  console.log('SQLite configuration detected. Updating Prisma schema...');
  // Force SQLite
  schemaContent = schemaContent.replace(/provider\s*=\s*"(sqlite|postgresql)"/, 'provider = "sqlite"');
  schemaContent = schemaContent.replace(/url\s*=\s*("(file:.\/dev.db)"|env\("DATABASE_URL"\))/, 'url = "file:./dev.db"');
  // Comment out directUrl
  if (schemaContent.includes('directUrl') && !schemaContent.includes('// directUrl')) {
    schemaContent = schemaContent.replace(/(\s+)(directUrl\s*=\s*env\("DIRECT_URL"\))/, '$1// $2');
  }
}

fs.writeFileSync(schemaPath, schemaContent);
console.log(`Prisma schema updated to use ${usePostgres ? 'PostgreSQL' : 'SQLite'} successfully.`);

