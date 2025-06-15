"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
exports.isDatabaseConnected = isDatabaseConnected;
const mongoose_1 = __importDefault(require("mongoose"));
const circuitBreaker_1 = require("../utils/circuitBreaker");
const logger_1 = __importDefault(require("../utils/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Try different connection string formats
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web-tools';
// Track connection status
let isConnected = false;
// Database connection with circuit breaker
const connectToDB = async () => {
    const dbBreaker = (0, circuitBreaker_1.createBreaker)('mongodb', async () => {
        // All connection options should be in this object
        const options = {
            serverSelectionTimeoutMS: 15000, // Increased timeout
            socketTimeoutMS: 45000, // Socket timeout
            // Do not use connectTimeoutMS directly - it's included in connection options
        };
        // Connect to MongoDB
        const connection = await mongoose_1.default.connect(MONGODB_URI, options);
        isConnected = true;
        return connection.connection;
    }, {
        timeout: 30000, // Increased from 10s to 30s
        errorThresholdPercentage: 70, // More tolerant - trip after 70% failures instead of 30%
        resetTimeout: 30000, // Try to recover more quickly - after 30s instead of 60s
    });
    // Set up all event handlers
    dbBreaker.on('success', () => {
        logger_1.default.debug('MongoDB connection successful');
        isConnected = true;
    });
    dbBreaker.on('failure', (error) => {
        logger_1.default.error(`MongoDB connection failed: ${error.message}`);
        isConnected = false;
    });
    dbBreaker.on('timeout', () => {
        logger_1.default.warn('MongoDB connection timed out');
        isConnected = false;
    });
    dbBreaker.on('reject', () => {
        logger_1.default.warn('MongoDB connection rejected (circuit open)');
        isConnected = false;
    });
    // More helpful fallback
    dbBreaker.fallback(() => {
        logger_1.default.error('Database connection circuit is open - using fallback');
        // Instead of throwing, return the existing connection if available
        if (mongoose_1.default.connection.readyState === 1) {
            logger_1.default.info('Using existing MongoDB connection as fallback');
            isConnected = true;
            return mongoose_1.default.connection;
        }
        // If no connection is available, throw an error
        isConnected = false;
        throw new Error('Database connection is not available');
    });
    try {
        // Execute the circuit breaker to attempt the connection
        const db = await dbBreaker.fire();
        logger_1.default.info('MongoDB connected successfully');
        isConnected = true;
        return db;
    }
    catch (error) {
        logger_1.default.error(`Failed to connect to MongoDB: ${error.message}`);
        isConnected = false;
        throw error;
    }
};
exports.connectDB = connectToDB;
/**
 * Check if the database is connected
 */
function isDatabaseConnected() {
    // Use both our flag and the mongoose connection state
    return isConnected && mongoose_1.default.connection.readyState === 1;
}
// Create a disconnection function for tests or graceful shutdown
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        logger_1.default.info('MongoDB disconnected');
    }
    catch (error) {
        logger_1.default.error(`MongoDB disconnection error: ${error.message}`);
    }
};
exports.disconnectDB = disconnectDB;
// Handle graceful shutdown
process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});
//# sourceMappingURL=database.js.map