import { connectDB } from '../config/database';
import { printShardingRecommendation } from '../config/sharding';

/**
 * Check Sharding Requirements Script
 * 
 * This script analyzes your current database to determine if sharding is needed.
 */

async function main() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Connected successfully');
    
    await printShardingRecommendation();
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  } finally {
    // Close the connection
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
main(); 