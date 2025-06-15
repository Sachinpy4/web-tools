"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const PageSeoSchema = new mongoose_1.default.Schema({
    pagePath: {
        type: String,
        required: [true, 'Page path is required'],
        unique: true,
        trim: true,
    },
    pageType: {
        type: String,
        enum: ['homepage', 'blog-listing', 'tool', 'about', 'custom'],
        required: [true, 'Page type is required'],
    },
    pageName: {
        type: String,
        required: [true, 'Page name is required'],
        trim: true,
    },
    metaTitle: {
        type: String,
        required: [true, 'Meta title is required'],
        maxlength: [70, 'Meta title cannot be more than 70 characters'],
    },
    metaDescription: {
        type: String,
        required: [true, 'Meta description is required'],
        maxlength: [160, 'Meta description cannot be more than 160 characters'],
    },
    metaKeywords: {
        type: [String],
        default: [],
    },
    canonicalUrl: {
        type: String,
        trim: true,
    },
    ogImage: {
        type: String,
        trim: true,
    },
    ogType: {
        type: String,
        default: 'website',
        enum: ['website', 'article', 'product', 'profile'],
    },
    twitterCard: {
        type: String,
        default: 'summary_large_image',
        enum: ['summary', 'summary_large_image', 'app', 'player'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    priority: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Create index for faster queries
// Note: pagePath index is already defined as unique in schema, so we don't need to duplicate it here
PageSeoSchema.index({ pageType: 1 });
PageSeoSchema.index({ isActive: 1 });
exports.default = mongoose_1.default.model('PageSeo', PageSeoSchema);
//# sourceMappingURL=PageSeo.js.map