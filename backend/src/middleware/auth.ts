import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/config';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as { userId: number; email: string };
    
    // ユーザーの存在確認
    const result = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// ボードメンバーかどうかを確認するミドルウェア
export async function checkBoardMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const boardId = req.params.boardId || req.body.boardId;
    const userId = req.user?.id;
    
    if (!boardId || !userId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const result = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a board member' });
    }
    
    // roleをリクエストに追加
    (req as any).memberRole = result.rows[0].role;
    
    next();
  } catch (error) {
    console.error('Board member check error:', error);
    res.status(500).json({ error: 'Failed to check board membership' });
  }
}

// ボード管理者かどうかを確認するミドルウェア
export async function checkBoardAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const boardId = req.params.boardId || req.body.boardId;
    const userId = req.user?.id;
    
    if (!boardId || !userId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const result = await pool.query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a board member' });
    }
    
    const role = result.rows[0].role;
    if (role !== 'owner' && role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Board admin check error:', error);
    res.status(500).json({ error: 'Failed to check admin rights' });
  }
}