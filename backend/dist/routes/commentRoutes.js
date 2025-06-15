"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const commentController_1 = require("../controllers/commentController");
const router = express_1.default.Router();
// Admin routes for comment management
router.route('/')
    .get(authMiddleware_1.protect, authMiddleware_1.adminOnly, commentController_1.getComments);
// Batch operations
router.patch('/approve-batch', authMiddleware_1.protect, authMiddleware_1.adminOnly, commentController_1.approveBatchComments);
router.delete('/delete-batch', authMiddleware_1.protect, authMiddleware_1.adminOnly, commentController_1.deleteBatchComments);
// Individual comment operations
router.patch('/:id/approve', authMiddleware_1.protect, authMiddleware_1.adminOnly, commentController_1.approveComment);
router.delete('/:id', authMiddleware_1.protect, commentController_1.deleteComment); // Allow users to delete their own comments
exports.default = router;
//# sourceMappingURL=commentRoutes.js.map