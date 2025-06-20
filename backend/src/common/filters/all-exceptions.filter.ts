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

    let status = 500;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
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
    }

    // Security: Sanitize authentication errors to prevent information disclosure
    if (this.isAuthenticationEndpoint(request.url)) {
      // For auth endpoints, return generic messages regardless of the actual error
      if (status === 401) {
        message = 'Authentication failed';
        error = 'Unauthorized';
      } else if (status === 400) {
        message = 'Invalid request';
        error = 'Bad Request';
      } else if (status === 429) {
        message = 'Too many attempts';
        error = 'Too Many Requests';
      }
      
      // Don't log sensitive auth details in production
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(`Auth error on ${request.method} ${request.url}:`, {
          status,
          message: typeof exception === 'object' && exception !== null ? (exception as any).message : exception,
          stack: exception instanceof Error ? exception.stack : undefined,
        });
      }
    } else {
      // Log non-auth errors normally
      this.logger.error(`Error on ${request.method} ${request.url}:`, {
        status,
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    // Security: Remove stack traces and detailed error info in production
    const responseBody: any = {
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
    };

    // Only include path for non-auth endpoints
    if (!this.isAuthenticationEndpoint(request.url)) {
      responseBody.path = request.url;
    }

    // Only include detailed error info in development
    if (process.env.NODE_ENV !== 'production') {
      responseBody.error = error;
      if (exception instanceof Error && exception.stack) {
        responseBody.stack = exception.stack;
      }
    }

    response.status(status).json(responseBody);
  }

  private isAuthenticationEndpoint(url: string): boolean {
    const authEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/setup-admin',
    ];
    
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }
} 