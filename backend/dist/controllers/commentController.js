"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBatchComments = exports.approveBatchComments = exports.deleteComment = exports.approveComment = exports.addComment = exports.getBlogComments = exports.getComments = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Comment_1 = __importDefault(require("../models/Comment"));
const Blog_1 = __importDefault(require("../models/Blog"));
const asyncHandler_1 = require("../utils/asyncHandler");
/**
 * @desc    Get all comments (with filtering options)
 * @route   GET /api/comments
 * @access  Private (Admin Only)
 */
exports.getComments = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Build filter query
    const query = {};
    // Filter by blog post
    if (req.query.blog) {
        query.blog = req.query.blog;
    }
    // Filter by approval status
    if (req.query.approved !== undefined) {
        query.approved = req.query.approved === 'true';
    }
    // Filter by user
    if (req.query.user) {
        query.user = req.query.user;
    }
    // Filter by parent (to get top-level comments or replies)
    if (req.query.parent) {
        query.parent = req.query.parent;
    }
    else if (req.query.parentExists === 'false') {
        query.parent = { $exists: false }; // Get only top-level comments
    }
    // Search for text matches
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query.$or = [
            { text: searchRegex },
            { name: searchRegex },
            { email: searchRegex }
        ];
    }
    // Count total items for pagination
    const total = await Comment_1.default.countDocuments(query);
    // Execute query with pagination
    const comments = await Comment_1.default.find(query)
        .populate('blog', 'title slug')
        .populate('user', 'name email')
        .populate('parent', 'text')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    res.status(200).json({
        status: 'success',
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        data: comments
    });
});
/**
 * @desc    Get comments for a specific blog post
 * @route   GET /api/blogs/:blogId/comments
 * @access  Public (only approved comments for public users)
 */
exports.getBlogComments = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blogId = req.params.blogId;
    // Verify blog exists
    const blog = await Blog_1.default.findById(blogId);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    // Verify comments are enabled
    if (!blog.commentsEnabled) {
        return res.status(403).json({
            status: 'error',
            message: 'Comments are disabled for this blog post'
        });
    }
    // Build query
    const query = { blog: blogId };
    // For non-admin users, only show approved comments
    if (!req.user || req.user.role !== 'admin') {
        query.approved = true;
    }
    // Only get top-level comments (no parent or null parent)
    // This was the issue - { $exists: false } doesn't match fields that exist with null value
    // Fix: check for both null value and non-existence
    query.parent = null;
    // Parse pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    // Get comments count
    const total = await Comment_1.default.countDocuments(query);
    // Get comments with their replies
    const comments = await Comment_1.default.find(query)
        .populate('user', 'name')
        .populate({
        path: 'replies',
        populate: {
            path: 'user',
            select: 'name'
        },
        match: !req.user || req.user.role !== 'admin' ? { approved: true } : {}
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    res.status(200).json({
        status: 'success',
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        data: comments
    });
});
/**
 * @desc    Add a comment to a blog post
 * @route   POST /api/blogs/:blogId/comments
 * @access  Public (if comments enabled), but may require approval
 */
exports.addComment = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const blogId = req.params.blogId;
    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'unknown';
    // Verify blog exists
    const blog = await Blog_1.default.findById(blogId);
    if (!blog) {
        return res.status(404).json({
            status: 'error',
            message: 'Blog post not found'
        });
    }
    // Verify comments are enabled
    if (!blog.commentsEnabled) {
        return res.status(403).json({
            status: 'error',
            message: 'Comments are disabled for this blog post'
        });
    }
    // Validate required fields
    const { name, email, text } = req.body;
    if (!name || !email || !text) {
        return res.status(400).json({
            status: 'error',
            message: 'Name, email, and comment text are required'
        });
    }
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide a valid email address'
        });
    }
    // Check for URLs in comment text
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][-a-zA-Z0-9]+\.[a-zA-Z0-9]{2,}(\/[^\s]*)?)/gi;
    if (urlRegex.test(text)) {
        return res.status(400).json({
            status: 'error',
            message: 'Links or web addresses are not allowed in comments'
        });
    }
    // If IP limitation is enabled, check if this IP already commented
    if (blog.limitCommentsPerIp) {
        const existingComment = await Comment_1.default.findOne({
            blog: blogId,
            ipAddress: ipAddress
        });
        if (existingComment) {
            return res.status(403).json({
                status: 'error',
                message: 'You have already submitted a comment for this blog post'
            });
        }
    }
    // Prepare comment data
    const commentData = {
        blog: new mongoose_1.default.Types.ObjectId(blogId),
        name: req.body.name,
        email: req.body.email,
        text: req.body.text,
        ipAddress: ipAddress,
        // Auto-approve comments if the user is admin, otherwise follow blog settings
        approved: req.user?.role === 'admin' ? true : !blog.requireCommentApproval
    };
    // If this is a reply to another comment
    if (req.body.parent) {
        // Verify parent comment exists
        const parentComment = await Comment_1.default.findById(req.body.parent);
        if (!parentComment) {
            return res.status(404).json({
                status: 'error',
                message: 'Parent comment not found'
            });
        }
        commentData.parent = new mongoose_1.default.Types.ObjectId(req.body.parent);
    }
    // If user is logged in, associate comment with user
    if (req.user) {
        commentData.user = req.user.id;
        // Don't override provided name if it exists
        if (!commentData.name) {
            // Since TypeScript is complaining that req.user.name doesn't exist,
            // let's just use a safe default value - this should be addressed in the User model later
            commentData.name = 'User ' + req.user.id.substring(0, 6);
        }
        // Don't override provided email if it exists
        if (!commentData.email) {
            // Use the email from the user object
            commentData.email = req.user.email;
        }
    }
    // Create the comment
    const comment = await Comment_1.default.create(commentData);
    // If this is a reply, add it to the parent's replies array
    if (req.body.parent) {
        await Comment_1.default.findByIdAndUpdate(req.body.parent, { $push: { replies: comment._id } });
    }
    res.status(201).json({
        status: 'success',
        data: comment,
        message: comment.approved ?
            'Comment posted successfully' :
            'Comment submitted and awaiting approval'
    });
});
/**
 * @desc    Approve a comment
 * @route   PATCH /api/comments/:id/approve
 * @access  Private (Admin Only)
 */
exports.approveComment = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const comment = await Comment_1.default.findById(req.params.id);
    if (!comment) {
        return res.status(404).json({
            status: 'error',
            message: 'Comment not found'
        });
    }
    comment.approved = true;
    await comment.save();
    res.status(200).json({
        status: 'success',
        data: comment,
        message: 'Comment approved successfully'
    });
});
/**
 * @desc    Delete a comment
 * @route   DELETE /api/comments/:id
 * @access  Private (Admin or Comment Author)
 */
exports.deleteComment = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const comment = await Comment_1.default.findById(req.params.id);
    if (!comment) {
        return res.status(404).json({
            status: 'error',
            message: 'Comment not found'
        });
    }
    // Only allow admin or the comment author to delete
    if (!req.user ||
        (req.user.role !== 'admin' &&
            (!comment.user || comment.user.toString() !== req.user.id.toString()))) {
        return res.status(403).json({
            status: 'error',
            message: 'Not authorized to delete this comment'
        });
    }
    // If comment has replies, handle them
    if (comment.replies && comment.replies.length > 0) {
        // Option 1: Delete all replies
        await Comment_1.default.deleteMany({ _id: { $in: comment.replies } });
        // Option 2 (alternative): Update replies to no longer have a parent
        // await Comment.updateMany(
        //   { _id: { $in: comment.replies } },
        //   { $unset: { parent: 1 } }
        // );
    }
    // If comment is a reply, remove it from parent's replies array
    if (comment.parent) {
        await Comment_1.default.findByIdAndUpdate(comment.parent, { $pull: { replies: comment._id } });
    }
    // Delete the comment using findByIdAndDelete instead of remove()
    await Comment_1.default.findByIdAndDelete(comment._id);
    res.status(200).json({
        status: 'success',
        message: 'Comment deleted successfully'
    });
});
/**
 * @desc    Batch approve comments
 * @route   POST /api/comments/approve-batch
 * @access  Private (Admin Only)
 */
exports.approveBatchComments = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { commentIds } = req.body;
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide an array of comment IDs to approve'
        });
    }
    const result = await Comment_1.default.updateMany({ _id: { $in: commentIds } }, { $set: { approved: true } });
    res.status(200).json({
        status: 'success',
        message: `${result.modifiedCount} comments approved successfully`
    });
});
/**
 * @desc    Batch delete comments
 * @route   DELETE /api/comments/delete-batch
 * @access  Private (Admin Only)
 */
exports.deleteBatchComments = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { commentIds } = req.body;
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide an array of comment IDs to delete'
        });
    }
    // First get all comments to be deleted
    const comments = await Comment_1.default.find({ _id: { $in: commentIds } });
    // Extract all parent IDs (for comments that are replies)
    const parentIds = comments
        .filter(comment => comment.parent)
        .map(comment => comment.parent);
    // Extract all comment IDs that have replies
    const commentsWithReplies = comments
        .filter(comment => comment.replies && comment.replies.length > 0);
    // Delete all replies of comments being deleted
    const replyIds = commentsWithReplies
        .flatMap(comment => comment.replies);
    if (replyIds.length > 0) {
        await Comment_1.default.deleteMany({ _id: { $in: replyIds } });
    }
    // Remove references to deleted comments from parent comments
    if (parentIds.length > 0) {
        await Comment_1.default.updateMany({ _id: { $in: parentIds } }, { $pull: { replies: { $in: commentIds } } });
    }
    // Delete the comments
    const result = await Comment_1.default.deleteMany({ _id: { $in: commentIds } });
    res.status(200).json({
        status: 'success',
        message: `${result.deletedCount} comments deleted successfully`
    });
});
//# sourceMappingURL=commentController.js.map