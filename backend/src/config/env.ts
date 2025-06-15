import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

// Environment variables with defaults
export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB in bytes
    maxFiles: parseInt(process.env.MAX_FILES || '5'), 
    dest: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}; 