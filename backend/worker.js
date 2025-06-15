// Worker process entry point script
// This script is used to start the worker processes that handle image processing jobs

console.log('Starting image processing worker...');

// Check if we're in production or development
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  // Only use ts-node in development
  require('ts-node/register');
  // Load the worker module from TypeScript source
  require('./src/workers/index');
} else {
  // In production, we use compiled JavaScript
  require('./dist/workers/index');
}

console.log('Worker process started successfully.'); 