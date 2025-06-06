import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// DATABASE_URLがある場合のみデータベース接続を作成
export const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'team_fusen',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // プロダクションでは強制終了しない
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});