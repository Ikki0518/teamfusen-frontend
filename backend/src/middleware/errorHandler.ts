import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
    });
  }

  // PostgreSQLのエラー
  if ((err as any).code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      status: 'error',
    });
  }

  // JWTエラー
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      status: 'error',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      status: 'error',
    });
  }

  // デフォルトのエラーレスポンス
  res.status(500).json({
    error: 'Internal server error',
    status: 'error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}