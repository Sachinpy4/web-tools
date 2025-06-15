"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexes = createIndexes;
exports.analyzeIndexPerformance = analyzeIndexPerformance;
exports.cleanupIndexes = cleanupIndexes;
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("../config/database");
const requiredIndexes = [
    // Blog Collection Indexes
    {
        collection: 'blogs',
        indexName: 'slug_unique',
        keys: { slug: 1 },
        options: { unique: true },
        purpose: 'Fast blog lookup by URL slug'
    },
    {
        collection: 'blogs',
        indexName: 'status_date',
        keys: { status: 1, date: -1 },
        purpose: 'List published posts chronologically'
    },
    {
        collection: 'blogs',
        indexName: 'category_status_date',
        keys: { category: 1, status: 1, date: -1 },
        purpose: 'Category page filtering with published posts'
    },
    {
        collection: 'blogs',
        indexName: 'author_status_date',
        keys: { author: 1, status: 1, date: -1 },
        purpose: 'Author dashboard and public author pages'
    },
    {
        collection: 'blogs',
        indexName: 'popularity_index',
        keys: { status: 1, views: -1 },
        purpose: 'Popular posts ranking'
    },
    {
        collection: 'blogs',
        indexName: 'scheduled_posts',
        keys: { scheduledPublishDate: 1 },
        options: {
            partialFilterExpression: {
                status: 'scheduled',
                scheduledPublishDate: { $exists: true }
            }
        },
        purpose: 'Automated publishing of scheduled posts'
    },
    // User Collection Indexes
    {
        collection: 'users',
        indexName: 'email_unique',
        keys: { email: 1 },
        options: { unique: true },
        purpose: 'User authentication and lookup'
    },
    {
        collection: 'users',
        indexName: 'role_active',
        keys: { role: 1, isActive: 1 },
        purpose: 'Admin user management'
    },
    // Comment Collection Indexes
    {
        collection: 'comments',
        indexName: 'blog_approved_date',
        keys: { blogId: 1, isApproved: 1, createdAt: -1 },
        purpose: 'Display approved comments on blog posts'
    },
    {
        collection: 'comments',
        indexName: 'moderation_queue',
        keys: { isApproved: 1, createdAt: -1 },
        purpose: 'Comment moderation dashboard'
    },
    {
        collection: 'comments',
        indexName: 'author_ip_tracking',
        keys: { authorIP: 1, createdAt: -1 },
        purpose: 'IP-based comment limiting and spam prevention'
    },
    // Media Collection Indexes
    {
        collection: 'media',
        indexName: 'filename_unique',
        keys: { filename: 1 },
        options: { unique: true },
        purpose: 'Prevent duplicate file uploads'
    },
    {
        collection: 'media',
        indexName: 'type_upload_date',
        keys: { type: 1, uploadDate: -1 },
        purpose: 'Media library filtering and sorting'
    },
    {
        collection: 'media',
        indexName: 'size_optimization',
        keys: { fileSize: -1 },
        purpose: 'Storage management and cleanup'
    }
];
/**
 * Create all required indexes
 */
async function createIndexes() {
    try {
        console.log('🔧 Starting database index creation...');
        await (0, database_1.connectDB)();
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection not available');
        }
        let created = 0;
        let existing = 0;
        let errors = 0;
        for (const indexInfo of requiredIndexes) {
            try {
                const collection = db.collection(indexInfo.collection);
                // Check if index already exists
                const existingIndexes = await collection.listIndexes().toArray();
                const indexExists = existingIndexes.some(idx => idx.name === indexInfo.indexName ||
                    JSON.stringify(idx.key) === JSON.stringify(indexInfo.keys));
                if (indexExists) {
                    console.log(`✅ Index already exists: ${indexInfo.collection}.${indexInfo.indexName}`);
                    existing++;
                }
                else {
                    // Create the index
                    await collection.createIndex(indexInfo.keys, {
                        name: indexInfo.indexName,
                        background: true, // Create in background for production
                        ...indexInfo.options
                    });
                    console.log(`🆕 Created index: ${indexInfo.collection}.${indexInfo.indexName}`);
                    console.log(`   Purpose: ${indexInfo.purpose}`);
                    created++;
                }
            }
            catch (error) {
                console.error(`❌ Failed to create index ${indexInfo.collection}.${indexInfo.indexName}:`, error);
                errors++;
            }
        }
        // Create text search indexes separately (they need special handling)
        await createTextSearchIndexes();
        console.log('\n📊 Index Creation Summary:');
        console.log(`   ✅ Created: ${created}`);
        console.log(`   ♻️  Existing: ${existing}`);
        console.log(`   ❌ Errors: ${errors}`);
        if (errors === 0) {
            console.log('\n🎉 All indexes created successfully!');
        }
        else {
            console.log('\n⚠️  Some indexes failed to create. Check errors above.');
        }
    }
    catch (error) {
        console.error('💥 Error during index creation:', error);
        throw error;
    }
}
/**
 * Create text search indexes
 */
async function createTextSearchIndexes() {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return;
        const blogsCollection = db.collection('blogs');
        // Check if text search index exists
        const indexes = await blogsCollection.listIndexes().toArray();
        const textIndexExists = indexes.some(idx => idx.name === 'blog_text_search');
        if (!textIndexExists) {
            await blogsCollection.createIndex({
                title: 'text',
                excerpt: 'text',
                content: 'text',
                tags: 'text',
                metaKeywords: 'text'
            }, {
                name: 'blog_text_search',
                weights: {
                    title: 10,
                    excerpt: 5,
                    tags: 3,
                    content: 1,
                    metaKeywords: 2
                },
                background: true
            });
            console.log('🔍 Created text search index for blogs');
        }
        else {
            console.log('✅ Text search index already exists for blogs');
        }
    }
    catch (error) {
        console.error('❌ Failed to create text search index:', error);
    }
}
/**
 * Analyze index usage and performance
 */
async function analyzeIndexPerformance() {
    try {
        console.log('\n📈 Analyzing index performance...');
        const db = mongoose_1.default.connection.db;
        if (!db)
            return;
        const collections = ['blogs', 'users', 'comments', 'media'];
        for (const collectionName of collections) {
            console.log(`\n📋 ${collectionName.toUpperCase()} Collection:`);
            const collection = db.collection(collectionName);
            try {
                // Use MongoDB driver's stats command instead of collection.stats()
                const stats = await db.command({ collStats: collectionName });
                const indexes = await collection.listIndexes().toArray();
                console.log(`   Documents: ${stats.count?.toLocaleString() || 0}`);
                console.log(`   Total Size: ${((stats.size || 0) / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   Index Count: ${indexes.length}`);
                console.log(`   Index Size: ${((stats.totalIndexSize || 0) / 1024 / 1024).toFixed(2)} MB`);
                // List all indexes
                indexes.forEach(idx => {
                    console.log(`   📌 ${idx.name}: ${JSON.stringify(idx.key)}`);
                });
            }
            catch (error) {
                // Collection might not exist yet
                console.log(`   ⚠️  Collection '${collectionName}' does not exist yet`);
            }
        }
    }
    catch (error) {
        console.error('❌ Error analyzing performance:', error);
    }
}
/**
 * Drop unused or old indexes
 */
async function cleanupIndexes() {
    try {
        console.log('\n🧹 Checking for unused indexes...');
        // This would typically involve analyzing query patterns
        // and identifying indexes that are never used
        console.log('ℹ️  Cleanup requires manual analysis of query patterns');
        console.log('   Use MongoDB Compass or db.collection.aggregate([{$indexStats: {}}])');
        console.log('   to identify unused indexes');
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}
/**
 * Main execution function
 */
async function main() {
    const command = process.argv[2] || 'create';
    try {
        switch (command) {
            case 'create':
                await createIndexes();
                break;
            case 'analyze':
                await createIndexes(); // Ensure indexes exist first
                await analyzeIndexPerformance();
                break;
            case 'cleanup':
                await cleanupIndexes();
                break;
            default:
                console.log('Usage: npm run indexes [create|analyze|cleanup]');
                break;
        }
    }
    catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}
// Run the script
if (require.main === module) {
    main();
}
//# sourceMappingURL=createIndexes.js.map