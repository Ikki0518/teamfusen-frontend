import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { pool } from '../db/config';
import { AppError } from '../middleware/errorHandler';
import { authenticate, checkBoardAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// バリデーションスキーマ
const inviteMemberSchema = z.object({
  boardId: z.number(),
  email: z.string().email().optional(),
  expiresIn: z.number().optional(), // 有効期限（時間）
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

// ボードメンバーの招待
router.post('/invite', authenticate, checkBoardAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { boardId, email, expiresIn = 24 } = inviteMemberSchema.parse(req.body);
    const userId = req.user!.id;

    // 招待リンク用のトークンを生成
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);

    await pool.query(
      'INSERT INTO invitations (board_id, token, created_by, expires_at) VALUES ($1, $2, $3, $4)',
      [boardId, token, userId, expiresAt]
    );

    // メールで送信する場合のロジックはここに追加（今回は招待リンクのみ返す）
    const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;

    res.json({
      inviteLink,
      expiresAt,
      message: email ? `Invitation sent to ${email}` : 'Invitation link created',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid input data'));
    }
    next(error);
  }
});

// 招待を受け入れる
router.post('/accept-invite/:token', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const token = req.params.token;
    const userId = req.user!.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 招待の確認
      const inviteResult = await client.query(
        'SELECT * FROM invitations WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL',
        [token]
      );

      if (inviteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return next(new AppError(400, 'Invalid or expired invitation'));
      }

      const invitation = inviteResult.rows[0];

      // すでにメンバーかチェック
      const memberCheck = await client.query(
        'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
        [invitation.board_id, userId]
      );

      if (memberCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return next(new AppError(400, 'Already a member of this board'));
      }

      // メンバーとして追加
      await client.query(
        'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
        [invitation.board_id, userId, 'member']
      );

      // 招待を使用済みにする
      await client.query(
        'UPDATE invitations SET used_at = NOW() WHERE id = $1',
        [invitation.id]
      );

      // ボード情報を取得
      const boardResult = await client.query(
        'SELECT * FROM boards WHERE id = $1',
        [invitation.board_id]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Successfully joined the board',
        board: boardResult.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// メンバーのロールを更新
router.put('/:boardId/members/:memberId', authenticate, checkBoardAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { boardId, memberId } = req.params;
    const { role } = updateMemberRoleSchema.parse(req.body);
    const userId = req.user!.id;

    // 自分自身のロールは変更できない
    if (parseInt(memberId) === userId) {
      return next(new AppError(400, 'Cannot change your own role'));
    }

    // ownerのロールは変更できない
    const memberResult = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, memberId]
    );

    if (memberResult.rows.length === 0) {
      return next(new AppError(404, 'Member not found'));
    }

    if (memberResult.rows[0].role === 'owner') {
      return next(new AppError(400, 'Cannot change owner role'));
    }

    // ロールを更新
    await pool.query(
      'UPDATE board_members SET role = $1 WHERE board_id = $2 AND user_id = $3',
      [role, boardId, memberId]
    );

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid input data'));
    }
    next(error);
  }
});

// メンバーを削除
router.delete('/:boardId/members/:memberId', authenticate, checkBoardAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { boardId, memberId } = req.params;

    // ownerは削除できない
    const memberResult = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, memberId]
    );

    if (memberResult.rows.length === 0) {
      return next(new AppError(404, 'Member not found'));
    }

    if (memberResult.rows[0].role === 'owner') {
      return next(new AppError(400, 'Cannot remove board owner'));
    }

    // メンバーを削除
    await pool.query(
      'DELETE FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, memberId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
});

// ボードから脱退
router.post('/:boardId/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const boardId = req.params.boardId;
    const userId = req.user!.id;

    // ownerは脱退できない
    const memberResult = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, userId]
    );

    if (memberResult.rows.length === 0) {
      return next(new AppError(404, 'Not a member of this board'));
    }

    if (memberResult.rows[0].role === 'owner') {
      return next(new AppError(400, 'Board owner cannot leave. Delete the board instead.'));
    }

    // メンバーから削除
    await pool.query(
      'DELETE FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, userId]
    );

    res.json({ message: 'Successfully left the board' });
  } catch (error) {
    next(error);
  }
});

export default router;