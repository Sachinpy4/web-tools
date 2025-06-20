import { PipeTransform, Injectable, ArgumentMetadata, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as DOMPurify from 'isomorphic-dompurify';
import * as validator from 'validator';

// Decorator to skip sanitization for specific endpoints
export const SkipSanitization = () => Reflector.createDecorator<boolean>();

@Injectable()
export class SanitizationPipe implements PipeTransform {
  constructor(private reflector?: Reflector) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    // Skip sanitization for file uploads completely
    if (this.isFileUpload(value)) {
      return value;
    }

    // Skip sanitization for image processing data
    if (this.isImageProcessingData(value)) {
      return value;
    }

    // Only sanitize string-based data (DTOs, query params)
    if (this.shouldSanitize(value, metadata)) {
      return this.sanitizeData(value);
    }

    return value;
  }

  private isFileUpload(value: any): boolean {
    if (!value || typeof value !== 'object') return false;

    // Single file upload
    if (value.fieldname && value.originalname && value.mimetype && value.buffer) {
      return true;
    }

    // Multiple file upload
    if (Array.isArray(value) && value.length > 0 && 
        value[0].fieldname && value[0].originalname && value[0].mimetype) {
      return true;
    }

    return false;
  }

  private isImageProcessingData(value: any): boolean {
    if (!value || typeof value !== 'object') return false;

    // Skip objects that contain image processing parameters
    const imageProcessingKeys = ['quality', 'width', 'height', 'format', 'crop', 'x', 'y'];
    const hasImageKeys = imageProcessingKeys.some(key => key in value);
    
    return hasImageKeys;
  }

  private shouldSanitize(value: any, metadata: ArgumentMetadata): boolean {
    // Only sanitize body and query parameters
    if (!['body', 'query'].includes(metadata.type)) {
      return false;
    }

    // Skip primitive non-string values
    if (typeof value !== 'object' && typeof value !== 'string') {
      return false;
    }

    return true;
  }

  private sanitizeData(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeData(item));
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeObject(obj: any): any {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Don't sanitize keys that are likely to be technical fields
      if (this.isTechnicalField(key)) {
        sanitized[key] = value;
        continue;
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private isTechnicalField(key: string): boolean {
    // Fields that should not be sanitized
    const technicalFields = [
      'id', '_id', 'objectId', 'userId', 'blogId', 'commentId',
      'mimetype', 'filename', 'originalname', 'fieldname',
      'quality', 'width', 'height', 'format', 'x', 'y',
      'size', 'buffer', 'path', 'destination',
      'isActive', 'priority', 'sort', 'limit', 'skip',
      'createdAt', 'updatedAt', 'timestamp',
      'ogType', 'twitterCard', 'canonicalUrl',
      // Script-related fields that need to contain HTML/JS
      'content', 'placement', 'platform', 'targetPages', 'excludePages'
    ];
    
    return technicalFields.includes(key) || key.endsWith('Id') || key.endsWith('_id');
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string' || str.length === 0) return str;

    // Skip URLs and email addresses
    if (this.isUrl(str) || this.isEmail(str)) {
      return str;
    }

    // Light sanitization for user content
    let sanitized = str;

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remove potentially dangerous SQL patterns (but preserve normal text)
    const dangerousPatterns = [
      /(\bunion\s+select\b)/gi,
      /(\bselect\s+.*\bfrom\b)/gi,
      /(\bdrop\s+table\b)/gi,
      /(\binsert\s+into\b)/gi,
      /(\bdelete\s+from\b)/gi,
      /(\bupdate\s+.*\bset\b)/gi,
    ];
    
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove script tags and dangerous HTML
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'], // Allow basic formatting
      ALLOWED_ATTR: [],
    });

    // Remove NoSQL injection patterns
    sanitized = sanitized.replace(/[\$\{\}]/g, '');

    return sanitized.trim();
  }

  private isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  private isEmail(str: string): boolean {
    return validator.isEmail(str);
  }
} 