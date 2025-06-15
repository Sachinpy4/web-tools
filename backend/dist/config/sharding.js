"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringQueries = exports.applicationChanges = exports.shardedDockerCompose = exports.shardingSetupCommands = exports.shardingStrategies = void 0;
exports.shouldImplementSharding = shouldImplementSharding;
exports.printShardingRecommendation = printShardingRecommendation;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Recommended sharding strategies for ToolsCandy collections
 */
exports.shardingStrategies = [
    {
        collection: 'blogs',
        shardKey: { _id: 'hashed' }, // or { category: 1, _id: 1 }
        reason: 'Even distribution of blog posts across shards',
        estimatedThreshold: '1M+ posts or 10GB+ collection size'
    },
    {
        collection: 'comments',
        shardKey: { blogId: 1, _id: 1 },
        reason: 'Keep comments with their related blog posts on same shard',
        estimatedThreshold: '10M+ comments or 5GB+ collection size'
    },
    {
        collection: 'media',
        shardKey: { uploadDate: 1, _id: 1 },
        reason: 'Time-based distribution for file management',
        estimatedThreshold: '1M+ files or 100GB+ storage'
    },
    {
        collection: 'analytics_logs', // Future collection for detailed analytics
        shardKey: { date: 1, _id: 1 },
        reason: 'Time-series data distribution',
        estimatedThreshold: '100M+ log entries'
    }
];
/**
 * Production Sharding Setup Commands
 *
 * These are the MongoDB commands you would run to set up sharding
 * in production. DO NOT run these on a small dataset.
 */
exports.shardingSetupCommands = {
    // 1. Enable sharding for the database
    enableSharding: `
    // Connect to mongos (MongoDB router)
    use admin
    sh.enableSharding("web-tools-prod")
  `,
    // 2. Create shard keys for collections
    createShardKeys: `
    // Shard the blogs collection
    sh.shardCollection("web-tools-prod.blogs", { "_id": "hashed" })
    
    // Shard the comments collection (compound key)
    sh.shardCollection("web-tools-prod.comments", { "blogId": 1, "_id": 1 })
    
    // Shard the media collection (time-based)
    sh.shardCollection("web-tools-prod.media", { "uploadDate": 1, "_id": 1 })
    
    // Shard analytics logs (time-series)
    sh.shardCollection("web-tools-prod.analytics_logs", { "date": 1, "_id": 1 })
  `,
    // 3. Monitor sharding status
    checkStatus: `
    // Check sharding status
    sh.status()
    
    // Check collection distribution
    db.blogs.getShardDistribution()
    db.comments.getShardDistribution()
    
    // Check balancer status
    sh.getBalancerState()
  `
};
/**
 * Docker Compose configuration for sharded MongoDB setup
 */
exports.shardedDockerCompose = `
# docker-compose.sharded.yml
# This is for PRODUCTION use only when you need sharding

version: '3.8'

services:
  # Config Server Replica Set (stores metadata)
  mongo-config-1:
    image: mongo:7
    command: mongod --configsvr --replSet configReplSet --port 27017 --dbpath /data/db
    volumes:
      - config1_data:/data/db
    networks:
      - mongo-cluster

  mongo-config-2:
    image: mongo:7
    command: mongod --configsvr --replSet configReplSet --port 27017 --dbpath /data/db
    volumes:
      - config2_data:/data/db
    networks:
      - mongo-cluster

  mongo-config-3:
    image: mongo:7
    command: mongod --configsvr --replSet configReplSet --port 27017 --dbpath /data/db
    volumes:
      - config3_data:/data/db
    networks:
      - mongo-cluster

  # Shard 1 Replica Set
  mongo-shard1-1:
    image: mongo:7
    command: mongod --shardsvr --replSet shard1ReplSet --port 27017 --dbpath /data/db
    volumes:
      - shard1_1_data:/data/db
    networks:
      - mongo-cluster

  mongo-shard1-2:
    image: mongo:7
    command: mongod --shardsvr --replSet shard1ReplSet --port 27017 --dbpath /data/db
    volumes:
      - shard1_2_data:/data/db
    networks:
      - mongo-cluster

  # Shard 2 Replica Set
  mongo-shard2-1:
    image: mongo:7
    command: mongod --shardsvr --replSet shard2ReplSet --port 27017 --dbpath /data/db
    volumes:
      - shard2_1_data:/data/db
    networks:
      - mongo-cluster

  mongo-shard2-2:
    image: mongo:7
    command: mongod --shardsvr --replSet shard2ReplSet --port 27017 --dbpath /data/db
    volumes:
      - shard2_2_data:/data/db
    networks:
      - mongo-cluster

  # MongoDB Router (mongos)
  mongo-router:
    image: mongo:7
    command: mongos --configdb configReplSet/mongo-config-1:27017,mongo-config-2:27017,mongo-config-3:27017 --port 27017
    ports:
      - "27017:27017"
    depends_on:
      - mongo-config-1
      - mongo-config-2
      - mongo-config-3
      - mongo-shard1-1
      - mongo-shard1-2
      - mongo-shard2-1
      - mongo-shard2-2
    networks:
      - mongo-cluster

volumes:
  config1_data:
  config2_data:
  config3_data:
  shard1_1_data:
  shard1_2_data:
  shard2_1_data:
  shard2_2_data:

networks:
  mongo-cluster:
    driver: bridge
`;
/**
 * Application code changes needed for sharded MongoDB
 */
exports.applicationChanges = {
    connectionString: `
    // Update connection string to use mongos router
    const MONGODB_URI = 'mongodb://mongo-router:27017/web-tools-prod'
    
    // Add read preference for better performance
    const mongooseOptions = {
      readPreference: 'secondaryPreferred', // Read from secondary when possible
      retryWrites: true, // Enable retryable writes
      w: 'majority', // Write concern for durability
      readConcern: { level: 'majority' } // Read concern for consistency
    }
  `,
    queryOptimizations: `
    // Always include shard key in queries when possible
    
    // GOOD: Includes shard key
    Blog.find({ _id: blogId, status: 'published' })
    
    // BAD: No shard key (causes scatter-gather query)
    Blog.find({ title: 'Some Title' })
    
    // GOOD: Includes compound shard key
    Comment.find({ blogId: blogId, _id: commentId })
    
    // BAD: Only partial shard key
    Comment.find({ _id: commentId })
  `
};
/**
 * Monitoring queries for sharded clusters
 */
exports.monitoringQueries = {
    checkBalance: `
    // Check if chunks are balanced across shards
    db.runCommand({ listShards: 1 })
    
    // See chunk distribution
    sh.status()
    
    // Check for jumbo chunks (over 64MB)
    db.chunks.find({ jumbo: true })
  `,
    performanceMetrics: `
    // Monitor shard operations
    db.serverStatus().sharding
    
    // Check balancer activity
    db.settings.find({ _id: "balancer" })
    
    // Monitor slow operations
    db.setProfilingLevel(1, { slowms: 100 })
    db.system.profile.find().sort({ ts: -1 }).limit(5)
  `
};
/**
 * Helper function to determine if sharding is needed
 */
function shouldImplementSharding() {
    return new Promise(async (resolve) => {
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                resolve({ needed: false, reasons: ['No database connection'], metrics: {} });
                return;
            }
            const reasons = [];
            const metrics = {};
            // Check database size
            const dbStats = await db.admin().command({ dbStats: 1 });
            metrics.totalSize = (dbStats.dataSize || 0) + (dbStats.indexSize || 0);
            metrics.totalSizeGB = metrics.totalSize / (1024 * 1024 * 1024);
            if (metrics.totalSizeGB > 50) {
                reasons.push(`Database size (${metrics.totalSizeGB.toFixed(2)}GB) exceeds 50GB threshold`);
            }
            // Check collection sizes
            const collections = ['blogs', 'comments', 'media'];
            for (const collName of collections) {
                try {
                    const collStats = await db.command({ collStats: collName });
                    metrics[`${collName}Size`] = collStats.size || 0;
                    metrics[`${collName}Count`] = collStats.count || 0;
                    if (collName === 'blogs' && (collStats.count || 0) > 1000000) {
                        reasons.push(`Blog collection has ${(collStats.count || 0).toLocaleString()} documents (>1M threshold)`);
                    }
                    if (collName === 'comments' && (collStats.count || 0) > 10000000) {
                        reasons.push(`Comments collection has ${(collStats.count || 0).toLocaleString()} documents (>10M threshold)`);
                    }
                }
                catch (error) {
                    // Collection might not exist yet
                    metrics[`${collName}Size`] = 0;
                    metrics[`${collName}Count`] = 0;
                }
            }
            // Check if current working set fits in memory
            try {
                const serverStatus = await db.admin().command({ serverStatus: 1 });
                if (serverStatus.mem && serverStatus.mem.resident) {
                    metrics.memoryUsage = serverStatus.mem.resident;
                    if (metrics.totalSizeGB > serverStatus.mem.resident * 0.8) {
                        reasons.push('Working set likely exceeds available memory');
                    }
                }
            }
            catch (error) {
                // Server status might not be available in all environments
                console.log('Note: Could not check memory usage (this is normal in some deployments)');
            }
            const needed = reasons.length > 0;
            resolve({ needed, reasons, metrics });
        }
        catch (error) {
            console.error('Error checking sharding requirements:', error);
            resolve({ needed: false, reasons: ['Error checking metrics'], metrics: {} });
        }
    });
}
/**
 * Print sharding recommendation
 */
async function printShardingRecommendation() {
    console.log('\n🔍 Analyzing Sharding Requirements...\n');
    const result = await shouldImplementSharding();
    console.log('📊 Current Database Metrics:');
    console.log(`   Total Size: ${result.metrics.totalSizeGB?.toFixed(2) || 'Unknown'} GB`);
    console.log(`   Blogs: ${result.metrics.blogsCount?.toLocaleString() || 0} documents`);
    console.log(`   Comments: ${result.metrics.commentsCount?.toLocaleString() || 0} documents`);
    console.log(`   Media: ${result.metrics.mediaCount?.toLocaleString() || 0} documents`);
    if (result.needed) {
        console.log('\n🚨 SHARDING RECOMMENDED:');
        result.reasons.forEach(reason => console.log(`   • ${reason}`));
        console.log('\n📋 Next Steps:');
        console.log('   1. Plan maintenance window');
        console.log('   2. Set up sharded cluster');
        console.log('   3. Migrate data with mongodump/mongorestore');
        console.log('   4. Update application connection strings');
        console.log('   5. Monitor performance after migration');
    }
    else {
        console.log('\n✅ SHARDING NOT NEEDED YET');
        console.log('   Continue with current single instance setup');
        console.log('   Re-evaluate when you reach:');
        console.log('   • 50GB+ database size');
        console.log('   • 1M+ blog posts');
        console.log('   • 10M+ comments');
        console.log('   • Performance degradation');
    }
    console.log('\n💡 Current Focus: Optimize with indexing first!');
    console.log('   Run: npm run indexes:create');
}
exports.default = {
    shardingStrategies: exports.shardingStrategies,
    shardingSetupCommands: exports.shardingSetupCommands,
    shouldImplementSharding,
    printShardingRecommendation
};
//# sourceMappingURL=sharding.js.map