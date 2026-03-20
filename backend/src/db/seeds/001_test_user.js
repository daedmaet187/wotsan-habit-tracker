import bcrypt from 'bcryptjs';
import pool from '../../config/db.js';

async function seed() {
  const hash = await bcrypt.hash('Test1234!', 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role) 
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    ['test@stuff187.com', hash, 'Test User', 'user']
  );
  console.log('✓ Test user created: test@stuff187.com / Test1234!');
  await pool.end();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
