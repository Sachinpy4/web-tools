import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `${method} ${url} - User: ${user?.email || 'Anonymous'} - Started`,
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `${method} ${url} - User: ${user?.email || 'Anonymous'} - Completed in ${duration}ms`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `${method} ${url} - User: ${user?.email || 'Anonymous'} - Failed in ${duration}ms`,
          error.stack,
        );
        return throwError(() => error);
      }),
    );
  }
} 