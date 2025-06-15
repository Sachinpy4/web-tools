"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Blog_1 = __importDefault(require("../models/Blog"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web-tools';
        await mongoose_1.default.connect(mongoURI);
        console.log('MongoDB connected...');
    }
    catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};
// Clean up blog slugs
const fixSlugs = async () => {
    try {
        console.log('Starting blog slug cleanup...');
        // Get all blogs
        const blogs = await Blog_1.default.find({});
        console.log(`Found ${blogs.length} blog posts to process`);
        let updatedCount = 0;
        // Process each blog
        for (const blog of blogs) {
            const originalSlug = blog.slug;
            // Skip if no slug
            if (!originalSlug)
                continue;
            // Clean up the slug
            const cleanSlug = originalSlug
                // Remove timestamp pattern (typically a hyphen followed by 6+ digits)
                .replace(/-+\d{6,}$/, '')
                // Remove random hash-like patterns (hex strings that look like IDs)
                .replace(/-+[a-f0-9]{8,}$/, '')
                // Remove any consecutive hyphens that might be left
                .replace(/-+/g, '-')
                // Remove trailing hyphens
                .replace(/-+$/g, '');
            // Only update if the slug has changed
            if (cleanSlug !== originalSlug && cleanSlug) {
                console.log(`Updating slug: "${originalSlug}" → "${cleanSlug}"`);
                // Update the slug
                blog.slug = cleanSlug;
                // Save the blog (this will trigger the pre-save hook which handles uniqueness)
                await blog.save();
                updatedCount++;
            }
        }
        console.log(`Slug cleanup complete. Updated ${updatedCount} blog posts.`);
    }
    catch (error) {
        console.error('Error fixing slugs:', error);
    }
    finally {
        // Disconnect from_MongoDB
        mongoose_1.default.disconnect();
        console.log('MongoDB disconnected');
    }
};
// Run the script
(async () => {
    await connectDB();
    await fixSlugs();
    process.exit(0);
})();
//# sourceMappingURL=fixBlogSlugs.js.map