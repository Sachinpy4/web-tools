import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// Decorator to skip advanced security for specific endpoints  
export const SkipAdvancedSecurity = Reflector.createDecorator<boolean>();

@Injectable()
export class AdvancedSecurityGuard implements CanActivate {
  private readonly logger = new Logger(AdvancedSecurityGuard.name);
  private readonly suspiciousIPs = new Map<string, { count: number; lastAttempt: number }>();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxSuspiciousRequests = 10;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private reflector: Reflector) {
    // Periodic cleanup of stale IP entries to prevent unbounded memory growth
    this.cleanupInterval = setInterval(() => this.cleanupStaleEntries(), 5 * 60 * 1000); // Every 5 minutes
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Skip security for endpoints marked with @SkipAdvancedSecurity
    const skipSecurity = this.reflector.get(SkipAdvancedSecurity, context.getHandler()) ||
                         this.reflector.get(SkipAdvancedSecurity, context.getClass());
    
    if (skipSecurity) {
      return true;
    }

    // Only apply advanced security to admin endpoints and high-risk operations
    if (!this.isHighRiskEndpoint(request)) {
      return true;
    }

    const clientIP = this.getClientIP(request);
    const userAgent = request.headers['user-agent'] || '';
    const body = request.body;
    const query = request.query;

    try {
      // Check for suspicious IP behavior
      if (this.isSuspiciousIP(clientIP)) {
        this.logger.warn(`Blocked suspicious IP: ${clientIP}`);
        throw new ForbiddenException('Access denied due to suspicious activity');
      }

      // Check for malicious patterns in request
      if (this.containsMaliciousPatterns(body, query, request.url)) {
        this.recordSuspiciousActivity(clientIP);
        this.logger.warn(`Blocked malicious request from ${clientIP}: ${request.url}`);
        throw new ForbiddenException('Request blocked due to security policy');
      }

      // Check for bot-like behavior
      if (this.isSuspiciousUserAgent(userAgent)) {
        this.recordSuspiciousActivity(clientIP);
        this.logger.warn(`Blocked suspicious user agent from ${clientIP}: ${userAgent}`);
        throw new ForbiddenException('Access denied');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error('Security guard error:', error);
      return true; // Allow request if security check fails
    }
  }

  private isHighRiskEndpoint(request: Request): boolean {
    const url = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    // Admin endpoints
    if (url.includes('/admin/')) return true;
    
    // Authentication endpoints
    if (url.includes('/auth/') && ['POST', 'PUT', 'PATCH'].includes(method)) return true;
    
    // Database operations
    if (url.includes('/backup/') && ['POST', 'DELETE'].includes(method)) return true;
    
    // Script execution (skip for admin users - will be handled by JWT + role guards)
    if (url.includes('/scripts/') && ['POST', 'PUT'].includes(method)) {
      // Allow if user has admin role (JWT will handle auth)
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return false; // Let JWT + role guards handle this
      }
      return true; // Apply security for unauthenticated requests
    }
    
    // SEO management (admin only)
    if (url.includes('/seo/') && ['POST', 'PUT', 'DELETE'].includes(method)) return true;

    // Blog management (admin only)
    if (url.includes('/blog/') && ['POST', 'PUT', 'DELETE'].includes(method)) return true;

    return false;
  }

  private getClientIP(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const realIp = request.headers['x-real-ip'];
    const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
    
    return (
      forwardedValue ||
      realIpValue ||
      request.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  private isSuspiciousIP(ip: string): boolean {
    const record = this.suspiciousIPs.get(ip);
    if (!record) return false;

    const now = Date.now();
    if (now - record.lastAttempt > this.rateLimitWindow) {
      this.suspiciousIPs.delete(ip);
      return false;
    }

    return record.count >= this.maxSuspiciousRequests;
  }

  private recordSuspiciousActivity(ip: string): void {
    const now = Date.now();
    const record = this.suspiciousIPs.get(ip);

    if (!record) {
      this.suspiciousIPs.set(ip, { count: 1, lastAttempt: now });
    } else {
      if (now - record.lastAttempt > this.rateLimitWindow) {
        this.suspiciousIPs.set(ip, { count: 1, lastAttempt: now });
      } else {
        record.count++;
        record.lastAttempt = now;
      }
    }
  }

  private containsMaliciousPatterns(_body: any, query: any, url: string): boolean {
    // Only check URL and query params — not body content, which may contain
    // legitimate text mentioning SQL keywords, dollar signs, etc.
    const urlAndQueryData = JSON.stringify({ query, url }).toLowerCase();

    // SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /select\s+.*\s+from/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+.*\s+set/i,
      /exec\s*\(/i,
      /execute\s*\(/i,
    ];

    // NoSQL injection patterns (only in URL/query, not body)
    const nosqlPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /\$or.*\$and/i,
    ];

    // XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    // Command injection patterns
    const commandPatterns = [
      /;\s*(rm|del|format|shutdown)/i,
      /\|\s*(nc|netcat|curl|wget)/i,
      /&&\s*(cat|type|more|less)/i,
      /`.*`/,
      /\$\(.*\)/,
    ];

    const allPatterns = [...sqlPatterns, ...nosqlPatterns, ...xssPatterns, ...commandPatterns];
    
    return allPatterns.some(pattern => pattern.test(urlAndQueryData));
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /burp/i,
      /dirbuster/i,
      /gobuster/i,
      /wfuzz/i,
      /ffuf/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Periodic cleanup of stale IP entries to prevent unbounded memory growth
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [ip, record] of this.suspiciousIPs.entries()) {
      if (now - record.lastAttempt > this.rateLimitWindow * 2) {
        this.suspiciousIPs.delete(ip);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} stale IP entries from security guard`);
    }
  }
} 