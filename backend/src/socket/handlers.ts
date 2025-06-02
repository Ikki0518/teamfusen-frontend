import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../db/config';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  boardRooms?: Set<string>;
}

export function setupSocketHandlers(io: Server) {
  // 認証ミドルウェア
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as { userId: number };

      socket.userId = decoded.userId;
      socket.boardRooms = new Set();
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // ボードに参加
    socket.on('join-board', async (boardId: number) => {
      try {
        // ユーザーがボードメンバーか確認
        const result = await pool.query(
          'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
          [boardId, socket.userId]
        );

        if (result.rows.length === 0) {
          socket.emit('error', { message: 'Not a board member' });
          return;
        }

        const room = `board-${boardId}`;
        socket.join(room);
        socket.boardRooms?.add(room);
        socket.emit('joined-board', { boardId });
        console.log(`User ${socket.userId} joined board ${boardId}`);
      } catch (error) {
        console.error('Error joining board:', error);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // ボードから退出
    socket.on('leave-board', (boardId: number) => {
      const room = `board-${boardId}`;
      socket.leave(room);
      socket.boardRooms?.delete(room);
      console.log(`User ${socket.userId} left board ${boardId}`);
    });

    // タスクの作成通知
    socket.on('task-created', async (data: { boardId: number; task: any }) => {
      const room = `board-${data.boardId}`;
      
      // 自分以外のボードメンバーに通知
      socket.to(room).emit('task-created', {
        task: data.task,
        createdBy: socket.userId,
      });
    });

    // タスクの更新通知
    socket.on('task-updated', async (data: { boardId: number; task: any }) => {
      const room = `board-${data.boardId}`;
      
      // 自分以外のボードメンバーに通知
      socket.to(room).emit('task-updated', {
        task: data.task,
        updatedBy: socket.userId,
      });
    });

    // タスクの削除通知
    socket.on('task-deleted', async (data: { boardId: number; taskId: number }) => {
      const room = `board-${data.boardId}`;
      
      // 自分以外のボードメンバーに通知
      socket.to(room).emit('task-deleted', {
        taskId: data.taskId,
        deletedBy: socket.userId,
      });
    });

    // タスクの並び替え通知
    socket.on('tasks-reordered', async (data: { boardId: number; updates: any[] }) => {
      const room = `board-${data.boardId}`;
      
      // 自分以外のボードメンバーに通知
      socket.to(room).emit('tasks-reordered', {
        updates: data.updates,
        reorderedBy: socket.userId,
      });
    });

    // メンバーの追加通知
    socket.on('member-added', async (data: { boardId: number; member: any }) => {
      const room = `board-${data.boardId}`;
      
      // 全てのボードメンバーに通知
      io.to(room).emit('member-added', {
        member: data.member,
        addedBy: socket.userId,
      });
    });

    // メンバーの削除通知
    socket.on('member-removed', async (data: { boardId: number; memberId: number }) => {
      const room = `board-${data.boardId}`;
      
      // 全てのボードメンバーに通知
      io.to(room).emit('member-removed', {
        memberId: data.memberId,
        removedBy: socket.userId,
      });
    });

    // ボードの更新通知
    socket.on('board-updated', async (data: { boardId: number; board: any }) => {
      const room = `board-${data.boardId}`;
      
      // 自分以外のボードメンバーに通知
      socket.to(room).emit('board-updated', {
        board: data.board,
        updatedBy: socket.userId,
      });
    });

    // 切断時の処理
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
}