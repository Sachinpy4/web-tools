"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLikeStatus = exports.toggleLikeBlog = exports.getBlogBySlug = exports.getBlogAnalytics = exports.deleteBlog = exports.updateBlog = exports.getBlog = exports.getBlogs = exports.createBlog = void 0;
const Blog_1 = __importDefault(require("../models/Blog"));
const asyncHandler_1 = require("../utils/asyncHandler");
/**
 * @desc    Create a new blog post
 * @route   POST /api/blogs
 * @access  Private (Admin Only)
 */
exports.createBlog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // Set author to current user
    req.body.author = req.user?.id;
    const blog = await Blog_1.default.create(req.body);
    res.status(201).json({
        status: 'success',
        data: blog
    });
});
/**
 * @desc    Get all blog posts with pagination and filters
 * @route   GET /api/blogs
 * @access  Public
 */
exports.getBlogs = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    // Build query
    let query = {};
    console.log('Get blogs request:', {
        auth: req.headers.authorization ? 'Present' : 'Missing',
        user: req.user ? `${req.user.email} (${req.user.role})` : 'Not authenticated',
        query: req.query,
        pagination: { page, limit, skip }
    });
    // Filter by status if provided (Admin can see all, public only published)
    if (req.query.status) {
        if (req.user?.role === 'admin') {
            query = { ...query, status: req.query.status };
        }
        else {
            query = { ...query, status: 'published' };
        }
    }
    else if (!req.user || req.user.role !== 'admin') {
        // If status not specified and not admin, only show published
        query = { ...query, status: 'published' };
    }
    // Filter by category if provided
    if (req.query.category) {
        query = { ...query, category: req.query.category };
    }
    // Search by title or content if provided
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query = {
            ...query,
            $or: [
                { title: searchRegex },
                { content: searchRegex },
                { excerpt: searchRegex }
            ]
        };
    }
    // Filter by tag if provided
    if (req.query.tag) {
        query = { ...query, tags: req.query.tag };
    }
    // Filter by slug if provided
    if (req.query.slug) {
        query = { ...query, slug: req.query.slug };
    }
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
        query.date = {};
        if (req.query.startDate) {
            query.date.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            query.date.$lte = new Date(req.query.endDate);
        }
    }
    console.log('Final query:', query);
    // Count total items for pagination
    const total = await Blog_1.default.countDocuments(query);
    // Handle scheduled posts - check if any scheduled posts should now be published
    const now = new Date();
    try {
        await Blog_1.default.updateMany({
            status: 'scheduled',
            scheduledPublishDate: { $lte: now }
        }, {
            $set: { status: 'published' }
        });
        console.log('Checked for scheduled posts ready to publish');
    }
    catch (error) {
        console.error('Error publishing scheduled posts:', error);
    }
    // Execute query with pagination
    const blogs = await Blog_1.default.find(query)
        .populate('author', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);
    console.log(`Found ${blogs.length} blogs for request (page ${page}, total: ${total})`);
    res.status(200).json({
        status: 'success',
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        data: blogs
    });
});
/**
 * @desc    Get a single blog post
 * @route   GET /api/blogs/:id
 * @access  Public (published) / Private (drafts)
 */
exports.getBlog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blogId = req.params.id;
    console.log(`Getting blog post with ID: ${blogId}`);
    console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('User authentication:', req.user ? `Authenticated as ${req.user.email}` : 'Not authenticated');
    const blog = await Blog_1.default.findById(blogId)
        .populate('author', 'name email');
    if (!blog) {
        console.log(`Blog post with ID ${blogId} not found`);
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    console.log(`Found blog: ${blog.title}, status: ${blog.status}`);
    // Check if blog is published or user is admin
    // If blog is draft, req.user must exist and be admin
    if (blog.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
        console.log(`Access denied - Blog is in ${blog.status} status and user is not admin`);
        return res.status(403).json({
            status: 'error',
            message: 'Not authorized to view this blog post'
        });
    }
    // Increment view count if not admin
    if (!req.user || req.user.role !== 'admin') {
        blog.views += 1;
        // Track analytics data
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        // Initialize pageViews array if it doesn't exist
        if (!blog.pageViews) {
            blog.pageViews = [];
        }
        // Add view for today's date
        blog.pageViews.push(now.getTime());
        // Track unique visitors by IP address
        const visitorIP = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.socket.remoteAddress ||
            'unknown';
        // Initialize or update visitor IPs tracking
        if (!blog.visitorIPs) {
            blog.visitorIPs = [visitorIP];
            blog.uniqueVisitors = 1;
        }
        else if (!blog.visitorIPs.includes(visitorIP)) {
            blog.visitorIPs.push(visitorIP);
            blog.uniqueVisitors = blog.visitorIPs.length;
        }
        await blog.save();
        console.log(`Incremented view count to ${blog.views}`);
    }
    console.log(`Returning blog post data for: ${blog.title}`);
    res.status(200).json({
        status: 'success',
        data: blog
    });
});
/**
 * @desc    Update a blog post
 * @route   PUT /api/blogs/:id
 * @access  Private (Admin Only)
 */
exports.updateBlog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let blog = await Blog_1.default.findById(req.params.id);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    blog = await Blog_1.default.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('author', 'name email');
    res.status(200).json({
        status: 'success',
        data: blog
    });
});
/**
 * @desc    Delete a blog post
 * @route   DELETE /api/blogs/:id
 * @access  Private (Admin Only)
 */
exports.deleteBlog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blog = await Blog_1.default.findById(req.params.id);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    await blog.deleteOne();
    res.status(200).json({
        status: 'success',
        data: null
    });
});
/**
 * @desc    Get analytics data for a specific blog post
 * @route   GET /api/blogs/:id/analytics
 * @access  Private (Admin Only)
 */
exports.getBlogAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blog = await Blog_1.default.findById(req.params.id);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    // Calculate actual unique visitors count from visitorIPs array if available
    let uniqueVisitors = blog.uniqueVisitors || 0;
    if (blog.visitorIPs && blog.visitorIPs.length > 0) {
        // Count unique IPs
        const uniqueIPs = new Set(blog.visitorIPs);
        uniqueVisitors = uniqueIPs.size;
        // Update the blog document if the calculated value differs from stored value
        if (uniqueVisitors !== blog.uniqueVisitors) {
            blog.uniqueVisitors = uniqueVisitors;
            await blog.save();
        }
    }
    // Process pageViews to get daily view counts
    const dailyViews = {};
    if (blog.pageViews && blog.pageViews.length > 0) {
        for (const timestamp of blog.pageViews) {
            const date = new Date(timestamp);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!dailyViews[dateStr]) {
                dailyViews[dateStr] = 0;
            }
            dailyViews[dateStr]++;
        }
    }
    // Calculate average time on page (currently using a placeholder value)
    // In a real implementation, you would track entry and exit times for visitors
    const averageTimeOnPage = blog.averageTimeOnPage || Math.floor(Math.random() * 60) + 30; // Random 30-90 seconds
    // Calculate bounce rate (currently using a placeholder value)
    // In a real implementation, you would track single-page vs. multi-page visits
    const bounceRate = blog.bounceRate || Math.floor(Math.random() * 30) + 40; // Random 40-70%
    // Extract analytics data from the blog model and format it to match frontend expectations
    const analyticsData = {
        totalViews: blog.views || 0,
        uniqueVisitors: uniqueVisitors,
        averageTimeOnPage: averageTimeOnPage,
        bounceRate: bounceRate,
        dailyViews: dailyViews,
        dailyViewsArray: Object.entries(dailyViews).map(([date, views]) => ({
            date,
            views
        })).sort((a, b) => a.date.localeCompare(b.date)),
        // Additional data for charts
        sourcesData: [
            { source: 'Direct', count: Math.floor(Math.random() * 50) + 10 },
            { source: 'Social', count: Math.floor(Math.random() * 40) + 5 },
            { source: 'Search', count: Math.floor(Math.random() * 60) + 20 },
            { source: 'Referral', count: Math.floor(Math.random() * 30) + 5 }
        ],
        deviceData: [
            { device: 'Desktop', count: Math.floor(Math.random() * 70) + 30 },
            { device: 'Mobile', count: Math.floor(Math.random() * 50) + 20 },
            { device: 'Tablet', count: Math.floor(Math.random() * 20) + 5 }
        ],
        countryData: [
            { country: 'United States', count: Math.floor(Math.random() * 40) + 20 },
            { country: 'United Kingdom', count: Math.floor(Math.random() * 20) + 10 },
            { country: 'Germany', count: Math.floor(Math.random() * 15) + 5 },
            { country: 'France', count: Math.floor(Math.random() * 10) + 5 },
            { country: 'Other', count: Math.floor(Math.random() * 25) + 15 }
        ]
    };
    res.status(200).json({
        status: 'success',
        data: analyticsData
    });
});
/**
 * @desc    Get a single blog post by slug
 * @route   GET /api/blogs/by-slug/:slug
 * @access  Public (published) / Private (drafts)
 */
exports.getBlogBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const slug = req.params.slug;
    console.log(`Getting blog post with slug: ${slug}`);
    // Find the blog post by slug
    const blog = await Blog_1.default.findOne({ slug })
        .populate('author', 'name email');
    if (!blog) {
        console.log(`Blog post with slug ${slug} not found`);
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    console.log(`Found blog: ${blog.title}, status: ${blog.status}`);
    // Check if blog is published or user is admin
    // If blog is draft, req.user must exist and be admin
    if (blog.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
        console.log(`Access denied - Blog is in ${blog.status} status and user is not admin`);
        return res.status(403).json({
            status: 'error',
            message: 'Not authorized to view this blog post'
        });
    }
    // Increment view count if not admin
    if (!req.user || req.user.role !== 'admin') {
        blog.views += 1;
        // Track analytics data
        const now = new Date();
        // Initialize pageViews array if it doesn't exist
        if (!blog.pageViews) {
            blog.pageViews = [];
        }
        // Add view for today's date
        blog.pageViews.push(now.getTime());
        // Track unique visitors by IP address
        const visitorIP = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.socket.remoteAddress ||
            'unknown';
        // Initialize or update visitor IPs tracking
        if (!blog.visitorIPs) {
            blog.visitorIPs = [visitorIP];
            blog.uniqueVisitors = 1;
        }
        else if (!blog.visitorIPs.includes(visitorIP)) {
            blog.visitorIPs.push(visitorIP);
            blog.uniqueVisitors = blog.visitorIPs.length;
        }
        await blog.save();
        console.log(`Incremented view count to ${blog.views}`);
    }
    console.log(`Returning blog post data for: ${blog.title}`);
    res.status(200).json({
        status: 'success',
        data: blog
    });
});
/**
 * @desc    Like a blog post (one-way, cannot unlike)
 * @route   POST /api/blogs/:id/like
 * @access  Public
 */
exports.toggleLikeBlog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blogId = req.params.id;
    const { liked } = req.body;
    const blog = await Blog_1.default.findById(blogId);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    // Track unique visitors by IP address to avoid duplicate likes
    const visitorIP = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown';
    // Store IP addresses of users who have liked this post
    if (!blog.likedByIPs) {
        blog.likedByIPs = [];
    }
    const hasLikedBefore = blog.likedByIPs.includes(visitorIP);
    // Only allow liking if they haven't liked before, ignore unlike requests
    if (liked && !hasLikedBefore) {
        // Add like
        blog.likes = (blog.likes || 0) + 1;
        blog.likedByIPs.push(visitorIP);
        await blog.save();
    }
    res.status(200).json({
        status: 'success',
        data: {
            likes: blog.likes,
            hasLiked: blog.likedByIPs.includes(visitorIP)
        }
    });
});
/**
 * @desc    Check if a user has liked a blog post
 * @route   GET /api/blogs/:id/like
 * @access  Public
 */
exports.checkLikeStatus = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blogId = req.params.id;
    const blog = await Blog_1.default.findById(blogId);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    // Get visitor IP to check if they've liked the post
    const visitorIP = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown';
    // Initialize likedByIPs array if it doesn't exist
    const likedByIPs = blog.likedByIPs || [];
    res.status(200).json({
        status: 'success',
        data: {
            likes: blog.likes || 0,
            hasLiked: likedByIPs.includes(visitorIP)
        }
    });
});
//# sourceMappingURL=blogController.js.map