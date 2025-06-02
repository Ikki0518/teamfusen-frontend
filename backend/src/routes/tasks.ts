import express from 'express';
import { z } from 'zod';
import { pool } from '../db/config';
import { AppError } from '../middleware/errorHandler';
import { authenticate, checkBoardMember, AuthRequest } from '../middleware/auth';

const router = express.Router();

// バリデーションスキーマ
const createTaskSchema = z.object({
  boardId: z.number(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assigneeId: z.number().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  tagColor: z.string().nullable().optional(),
  position: z.number().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assigneeId: z.number().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  tagColor: z.string().nullable().optional(),
  position: z.number().optional(),
});

// ボードのタスク一覧を取得
router.get('/board/:boardId', authenticate, checkBoardMember, async (req: AuthRequest, res, next) => {
  try {
    const boardId = req.params.boardId;

    const result = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.board_id = $1
       ORDER BY t.status, t.position, t.created_at`,
      [boardId]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    next(error);
  }
});

// タスクを作成
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const userId = req.user!.id;

    // ボードメンバーかチェック
    const memberCheck = await pool.query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [data.boardId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return next(new AppError(403, 'Not a board member'));
    }

    // assigneeIdが指定されている場合、そのユーザーがボードメンバーかチェック
    if (data.assigneeId) {
      const assigneeCheck = await pool.query(
        'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
        [data.boardId, data.assigneeId]
      );

      if (assigneeCheck.rows.length === 0) {
        return next(new AppError(400, 'Assignee is not a board member'));
      }
    }

    // positionが指定されていない場合、最大値+1を設定
    let position = data.position;
    if (position === undefined) {
      const maxPositionResult = await pool.query(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM tasks WHERE board_id = $1 AND status = $2',
        [data.boardId, data.status || 'todo']
      );
      position = maxPositionResult.rows[0].next_position;
    }

    const result = await pool.query(
      `INSERT INTO tasks (board_id, title, description, status, assignee_id, due_date, tag_color, position, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.boardId,
        data.title,
        data.description || null,
        data.status || 'todo',
        data.assigneeId || null,
        data.dueDate || null,
        data.tagColor || null,
        position,
        userId,
      ]
    );

    // assignee情報を含めて返す
    if (result.rows[0].assignee_id) {
      const userResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [result.rows[0].assignee_id]
      );
      if (userResult.rows.length > 0) {
        result.rows[0].assignee_name = userResult.rows[0].name;
        result.rows[0].assignee_email = userResult.rows[0].email;
      }
    }

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return next(new AppError(400, 'Invalid input data: ' + JSON.stringify(error.errors)));
    }
    next(error);
  }
});

// タスクを更新
router.put('/:taskId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user!.id;
    const data = updateTaskSchema.parse(req.body);

    // タスクの存在確認とボードメンバーかチェック
    const taskResult = await pool.query(
      `SELECT t.*, bm.role
       FROM tasks t
       JOIN board_members bm ON t.board_id = bm.board_id
       WHERE t.id = $1 AND bm.user_id = $2`,
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return next(new AppError(404, 'Task not found or not authorized'));
    }

    const task = taskResult.rows[0];

    // assigneeIdが変更される場合、新しいassigneeがボードメンバーかチェック
    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const assigneeCheck = await pool.query(
        'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
        [task.board_id, data.assigneeId]
      );

      if (assigneeCheck.rows.length === 0) {
        return next(new AppError(400, 'Assignee is not a board member'));
      }
    }

    // 更新クエリの構築
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramCount++}`);
      values.push(data.assigneeId);
    }
    if (data.dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(data.dueDate);
    }
    if (data.tagColor !== undefined) {
      updates.push(`tag_color = $${paramCount++}`);
      values.push(data.tagColor);
    }
    if (data.position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(data.position);
    }

    if (updates.length === 0) {
      return res.json({ message: 'No updates provided' });
    }

    values.push(taskId);
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    // assignee情報を含めて返す
    if (result.rows[0].assignee_id) {
      const userResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [result.rows[0].assignee_id]
      );
      if (userResult.rows.length > 0) {
        result.rows[0].assignee_name = userResult.rows[0].name;
        result.rows[0].assignee_email = userResult.rows[0].email;
      }
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Task update validation error:', error.errors);
      return next(new AppError(400, 'Invalid input data: ' + JSON.stringify(error.errors)));
    }
    next(error);
  }
});

// タスクを削除
router.delete('/:taskId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user!.id;

    // タスクの存在確認とボードメンバーかチェック
    const taskResult = await pool.query(
      `SELECT t.id
       FROM tasks t
       JOIN board_members bm ON t.board_id = bm.board_id
       WHERE t.id = $1 AND bm.user_id = $2`,
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return next(new AppError(404, 'Task not found or not authorized'));
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// タスクのステータス更新（簡易版）
router.patch('/:taskId/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user!.id;
    const { status } = z.object({
      status: z.enum(['todo', 'in_progress', 'done'])
    }).parse(req.body);

    // タスクの存在確認とボードメンバーかチェック
    const taskResult = await pool.query(
      `SELECT t.*, bm.role
       FROM tasks t
       JOIN board_members bm ON t.board_id = bm.board_id
       WHERE t.id = $1 AND bm.user_id = $2`,
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return next(new AppError(404, 'Task not found or not authorized'));
    }

    // ステータスを更新
    const updateResult = await pool.query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, taskId]
    );

    res.json({ task: updateResult.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return next(new AppError(400, `Invalid input data: ${JSON.stringify(error.errors)}`));
    }
    next(error);
  }
});

// タスクの一括並び替え
router.post('/reorder', authenticate, async (req: AuthRequest, res, next) => {
  try {
    console.log('Reorder request body:', JSON.stringify(req.body, null, 2));
    
    const { boardId, updates } = z.object({
      boardId: z.number(),
      updates: z.array(z.object({
        taskId: z.number(),
        status: z.enum(['todo', 'in_progress', 'done']),
        position: z.number(),
      })),
    }).parse(req.body);

    const userId = req.user!.id;

    // ボードメンバーかチェック
    const memberCheck = await pool.query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return next(new AppError(403, 'Not a board member'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        await client.query(
          'UPDATE tasks SET status = $1, position = $2 WHERE id = $3 AND board_id = $4',
          [update.status, update.position, update.taskId, boardId]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Tasks reordered successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.errors);
      return next(new AppError(400, `Invalid input data: ${JSON.stringify(error.errors)}`));
    }
    next(error);
  }
});

export default router;