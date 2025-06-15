"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const sharding_1 = require("../config/sharding");
/**
 * Check Sharding Requirements Script
 *
 * This script analyzes your current database to determine if sharding is needed.
 */
async function main() {
    try {
        console.log('🔍 Connecting to database...');
        await (0, database_1.connectDB)();
        console.log('✅ Connected successfully');
        await (0, sharding_1.printShardingRecommendation)();
    }
    catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
    finally {
        // Close the connection
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}
// Run the script
main();
//# sourceMappingURL=checkSharding.js.map