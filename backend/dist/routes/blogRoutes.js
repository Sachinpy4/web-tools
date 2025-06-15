"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const blogController_1 = require("../controllers/blogController");
const commentController_1 = require("../controllers/commentController");
const router = express_1.default.Router();
// Blog post routes
router.route('/')
    .get(blogController_1.getBlogs)
    .post(authMiddleware_1.protect, authMiddleware_1.adminOnly, blogController_1.createBlog);
router.get('/by-slug/:slug', blogController_1.getBlogBySlug);
// Add the analytics route
router.get('/:id/analytics', authMiddleware_1.protect, authMiddleware_1.adminOnly, blogController_1.getBlogAnalytics);
router.route('/:id')
    .get(blogController_1.getBlog)
    .put(authMiddleware_1.protect, authMiddleware_1.adminOnly, blogController_1.updateBlog)
    .delete(authMiddleware_1.protect, authMiddleware_1.adminOnly, blogController_1.deleteBlog);
// Comment routes for blogs
router.route('/:blogId/comments')
    .get(commentController_1.getBlogComments)
    .post(commentController_1.addComment);
// Like a blog post
router.route('/:id/like')
    .get(blogController_1.checkLikeStatus)
    .post(blogController_1.toggleLikeBlog);
exports.default = router;
//# sourceMappingURL=blogRoutes.js.map