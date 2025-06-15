"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CommentSchema = new mongoose_1.default.Schema({
    blog: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Blog',
        required: [true, 'Blog post reference is required'],
        index: true
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    text: {
        type: String,
        required: [true, 'Comment text is required'],
        trim: true,
        maxlength: [1000, 'Comment cannot be more than 1000 characters'],
    },
    approved: {
        type: Boolean,
        default: false
    },
    ipAddress: {
        type: String,
        required: true
    },
    replies: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Comment'
        }],
    parent: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    }
}, {
    timestamps: true,
});
// Create compound index for IP address + blog post for limiting comments per IP
CommentSchema.index({ ipAddress: 1, blog: 1 });
// Check if the model already exists to prevent recompilation error
const Comment = mongoose_1.default.models.Comment || mongoose_1.default.model('Comment', CommentSchema);
exports.default = Comment;
//# sourceMappingURL=Comment.js.map