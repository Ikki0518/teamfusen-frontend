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
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
    });
    return;
  }

  // PostgreSQLのエラー
  if ((err as any).code === '23505') {
    res.status(409).json({
      error: 'Duplicate entry',
      status: 'error',
    });
    return;
  }

  // JWTエラー
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
      status: 'error',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
      status: 'error',
    });
    return;
  }

  // デフォルトのエラーレスポンス
  res.status(500).json({
    error: 'Internal server error',
    status: 'error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}