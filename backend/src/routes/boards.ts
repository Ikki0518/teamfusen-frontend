import express from 'express';
import { z } from 'zod';
import { pool } from '../db/config';
import { AppError } from '../middleware/errorHandler';
import { authenticate, checkBoardAdmin, checkBoardMember, AuthRequest } from '../middleware/auth';

const router = express.Router();

// バリデーションスキーマ
const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// ユーザーのボード一覧を取得
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT b.*, bm.role
       FROM boards b
       JOIN board_members bm ON b.id = bm.board_id
       WHERE bm.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({ boards: result.rows });
  } catch (error) {
    next(error);
  }
});

// ボードの詳細を取得
router.get('/:boardId', authenticate, checkBoardMember, async (req: AuthRequest, res, next) => {
  try {
    const boardId = req.params.boardId;

    const boardResult = await pool.query(
      'SELECT * FROM boards WHERE id = $1',
      [boardId]
    );

    if (boardResult.rows.length === 0) {
      return next(new AppError(404, 'Board not found'));
    }

    // メンバー一覧も取得
    const membersResult = await pool.query(
      `SELECT u.id, u.email, u.name, bm.role, bm.joined_at
       FROM board_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.board_id = $1`,
      [boardId]
    );

    res.json({
      board: boardResult.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// ボードを作成
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, description } = createBoardSchema.parse(req.body);
    const userId = req.user!.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ボードを作成
      const boardResult = await client.query(
        'INSERT INTO boards (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
        [name, description || null, userId]
      );

      const board = boardResult.rows[0];

      // 作成者をownerとして追加
      await client.query(
        'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
        [board.id, userId, 'owner']
      );

      await client.query('COMMIT');

      res.status(201).json({ board });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid input data'));
    }
    next(error);
  }
});

// ボードを更新
router.put('/:boardId', authenticate, checkBoardAdmin, async (req: AuthRequest, res, next) => {
  try {
    const boardId = req.params.boardId;
    const { name, description } = updateBoardSchema.parse(req.body);

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.json({ message: 'No updates provided' });
    }

    values.push(boardId);
    const result = await pool.query(
      `UPDATE boards SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return next(new AppError(404, 'Board not found'));
    }

    res.json({ board: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid input data'));
    }
    next(error);
  }
});

// ボードを削除
router.delete('/:boardId', authenticate, checkBoardAdmin, async (req: AuthRequest, res, next) => {
  try {
    const boardId = req.params.boardId;
    const userId = req.user!.id;

    // ownerのみ削除可能
    const roleResult = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, userId]
    );

    if (roleResult.rows.length === 0 || roleResult.rows[0].role !== 'owner') {
      return next(new AppError(403, 'Only board owner can delete the board'));
    }

    await pool.query('DELETE FROM boards WHERE id = $1', [boardId]);

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;