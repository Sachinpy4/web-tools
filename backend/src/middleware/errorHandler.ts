import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number;
  keyValue?: Record<string, any>;
  errors?: Record<string, { message: string }>;
  value?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);
  
  let error = { ...err };
  error.message = err.message;
  
  // Handle specific error types
  
  // Mongoose bad ObjectId
  if (err instanceof mongoose.Error.CastError) {
    // Use type assertion for mongoose specific error
    const castError = err as unknown as mongoose.Error.CastError;
    const message = `Resource not found with id of ${castError.value}`;
    error = new Error(message) as AppError;
    error.statusCode = 404;
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = `Duplicate field value: ${field}. Please use another value`;
    error = new Error(message) as AppError;
    error.statusCode = 400;
  }
  
  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    // Use type assertion for mongoose specific error
    const validationError = err as unknown as mongoose.Error.ValidationError;
    const message = Object.values(validationError.errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new Error(message) as AppError;
    error.statusCode = 400;
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new Error('Invalid token. Please log in again.') as AppError;
    error.statusCode = 401;
  }
  
  if (err.name === 'TokenExpiredError') {
    error = new Error('Your token has expired. Please log in again.') as AppError;
    error.statusCode = 401;
  }
  
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  
  res.status(statusCode).json({
    status,
    message: error.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}; 