import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: string | undefined;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        code = (exceptionResponse as any).code;
        details = (exceptionResponse as any).details;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      
      // Handle specific error types (same as original errorHandler)
      if (exception.message.includes('Cast to ObjectId failed')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid ID format';
      } else if (exception.message.includes('duplicate key error')) {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      } else if (exception.message.includes('ValidationError')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Validation failed';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    // Log error (same as original)
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
    };

    if (status >= 500) {
      this.logger.error(errorLog);
    } else {
      this.logger.warn(errorLog);
    }

    // Return error response (same format as original)
    const errorResponse = {
      status: 'error',
      message,
      ...(code && { code }),
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    response.status(status).json(errorResponse);
  }
} 