import { Request, Response, NextFunction } from 'express';

/**
 * Async handler to avoid try-catch in controllers
 * @param fn Controller function that returns a Promise
 * @returns Express middleware function with error handling
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 