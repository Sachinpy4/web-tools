import mongoose from 'mongoose';
import { createBreaker } from '../utils/circuitBreaker';
import logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

// Try different connection string formats
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web-tools';

// Track connection status
let isConnected = false;

// Database connection with circuit breaker
const connectToDB = async (): Promise<mongoose.Connection> => {
  const dbBreaker = createBreaker<mongoose.Connection>(
    'mongodb',
    async () => {
      // All connection options should be in this object
      const options: mongoose.ConnectOptions = {
        serverSelectionTimeoutMS: 15000, // Increased timeout
        socketTimeoutMS: 45000, // Socket timeout
        // Do not use connectTimeoutMS directly - it's included in connection options
      };
      
      // Connect to MongoDB
      const connection = await mongoose.connect(MONGODB_URI, options);
      isConnected = true;
      return connection.connection;
    },
    {
      timeout: 30000, // Increased from 10s to 30s
      errorThresholdPercentage: 70, // More tolerant - trip after 70% failures instead of 30%
      resetTimeout: 30000, // Try to recover more quickly - after 30s instead of 60s
    }
  );

  // Set up all event handlers
  dbBreaker.on('success', () => {
    logger.debug('MongoDB connection successful');
    isConnected = true;
  });
  
  dbBreaker.on('failure', (error) => {
    logger.error(`MongoDB connection failed: ${error.message}`);
    isConnected = false;
  });
  
  dbBreaker.on('timeout', () => {
    logger.warn('MongoDB connection timed out');
    isConnected = false;
  });
  
  dbBreaker.on('reject', () => {
    logger.warn('MongoDB connection rejected (circuit open)');
    isConnected = false;
  });

  // More helpful fallback
  dbBreaker.fallback(() => {
    logger.error('Database connection circuit is open - using fallback');
    // Instead of throwing, return the existing connection if available
    if (mongoose.connection.readyState === 1) {
      logger.info('Using existing MongoDB connection as fallback');
      isConnected = true;
      return mongoose.connection;
    }
    // If no connection is available, throw an error
    isConnected = false;
    throw new Error('Database connection is not available');
  });

  try {
    // Execute the circuit breaker to attempt the connection
    const db = await dbBreaker.fire() as mongoose.Connection;
    logger.info('MongoDB connected successfully');
    isConnected = true;
    return db;
  } catch (error: any) {
    logger.error(`Failed to connect to MongoDB: ${error.message}`);
    isConnected = false;
    throw error;
  }
};

/**
 * Check if the database is connected
 */
export function isDatabaseConnected(): boolean {
  // Use both our flag and the mongoose connection state
  return isConnected && mongoose.connection.readyState === 1;
}

// Create a disconnection function for tests or graceful shutdown
const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error: any) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

// Export functions
export { connectToDB as connectDB, disconnectDB }; 