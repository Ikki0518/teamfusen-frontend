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

## ライセンス

MIT