# チームふせん (Team Fusen)

超シンプルな共有Todoアプリ - ホワイトボードに貼られた"ふせん"のように、手軽にタスクを書き出し、チームでリアルタイムに共有・管理できます。

## 機能

- ✅ ユーザー認証（メールアドレス・パスワード）
- ✅ 複数ボード作成・管理
- ✅ ふせん（タスク）の作成・編集・削除
- ✅ ドラッグ＆ドロップによるステータス変更
- ✅ メンバー招待・管理
- ✅ リアルタイム同期
- ✅ シンプルな通知機能

## 技術スタック

### フロントエンド
- React 18 + TypeScript
- Tailwind CSS（スタイリング）
- Socket.io-client（リアルタイム通信）
- React Beautiful DnD（ドラッグ＆ドロップ）

### バックエンド
- Node.js + Express + TypeScript
- PostgreSQL（データベース）
- Socket.io（リアルタイム通信）
- JWT（認証）

## セットアップ

### 必要な環境
- Node.js 18以上
- PostgreSQL 14以上

### インストール手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd team-fusen
```

2. 依存関係のインストール
```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

3. 環境変数の設定
```bash
# backend/.env
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

4. データベースのセットアップ
```bash
cd backend
npm run db:migrate
```

5. 開発サーバーの起動
```bash
# バックエンド
cd backend
npm run dev

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

## デプロイ

### Vercelへのデプロイ

このプロジェクトはVercelで簡単にデプロイできます。

#### 前提条件
- PostgreSQLデータベース（NeonやSupabaseなど）
- Vercelアカウント

#### デプロイ手順

1. GitHubリポジトリをVercelに接続

2. 環境変数を設定（Vercelダッシュボード）:
```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database_name
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app.vercel.app
```

3. データベースマイグレーション実行:
```bash
# ローカルで実行（DATABASE_URLを本番用に設定）
cd backend
npm run db:migrate
```

4. Vercelでデプロイ実行

#### 設定ファイル
- `vercel.json`: フロントエンド（Vite）とバックエンド（API関数）の設定
- バックエンドは`backend/api/index.ts`で実行
- フロントエンドは`frontend/dist`から配信

## ライセンス

MIT