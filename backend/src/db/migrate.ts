import { pool } from './config';

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    // ユーザーテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ボードテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ボードメンバーテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS board_members (
        id SERIAL PRIMARY KEY,
        board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_id, user_id)
      )
    `);
    
    // タスク（ふせん）テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, done
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        tag_color VARCHAR(50),
        position INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 招待リンクテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // インデックスの作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
    `);
    
    // 更新日時の自動更新トリガー
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // 各テーブルにトリガーを設定
    const tables = ['users', 'boards', 'tasks'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 実行
migrate()
  .then(() => {
    console.log('Migration process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });