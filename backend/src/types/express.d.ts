import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      loginSecurity?: {
        ip: string;
        currentAttempts: number;
        isBlocked: boolean;
      };
    }
  }
} 