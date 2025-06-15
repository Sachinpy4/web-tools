"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env file
dotenv_1.default.config();
// Environment variables with defaults
exports.config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB in bytes
        maxFiles: parseInt(process.env.MAX_FILES || '5'),
        dest: process.env.UPLOAD_DIR || path_1.default.join(__dirname, '../../uploads')
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};
//# sourceMappingURL=env.js.map