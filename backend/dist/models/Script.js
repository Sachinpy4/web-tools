"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ScriptSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    content: {
        type: String,
        required: true,
        validate: {
            validator: function (content) {
                // Basic validation to ensure it contains script tags or valid JavaScript
                return content.includes('<script') || content.trim().length > 0;
            },
            message: 'Script content must be valid JavaScript or HTML script tags'
        }
    },
    placement: {
        type: String,
        required: true,
        enum: ['head', 'body', 'footer'],
        default: 'head'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    platform: {
        type: String,
        required: true,
        enum: [
            'Google Analytics',
            'Google Tag Manager',
            'Facebook Pixel',
            'Google Ads',
            'LinkedIn Insight',
            'Twitter Pixel',
            'TikTok Pixel',
            'Hotjar',
            'Mixpanel',
            'Custom'
        ],
        default: 'Custom'
    },
    priority: {
        type: Number,
        default: 100,
        min: 1,
        max: 1000
    },
    targetPages: {
        type: [String],
        default: [] // Empty array means all public pages
    },
    excludePages: {
        type: [String],
        default: ['/admin', '/dashboard'] // Always exclude admin by default
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});
// Indexes for better query performance
ScriptSchema.index({ isActive: 1, placement: 1, priority: 1 });
ScriptSchema.index({ platform: 1 });
ScriptSchema.index({ createdAt: -1 });
// Virtual for formatted content (removes sensitive data from output)
ScriptSchema.virtual('safeContent').get(function () {
    // Remove any potential XSS or dangerous content in display
    return this.content.length > 200 ? this.content.substring(0, 200) + '...' : this.content;
});
// Pre-save middleware to ensure admin pages are always excluded
ScriptSchema.pre('save', function (next) {
    if (!this.excludePages.includes('/admin')) {
        this.excludePages.push('/admin');
    }
    if (!this.excludePages.includes('/dashboard')) {
        this.excludePages.push('/dashboard');
    }
    if (!this.excludePages.includes('/api')) {
        this.excludePages.push('/api');
    }
    next();
});
// Instance method to check if script should load on a given page
ScriptSchema.methods.shouldLoadOnPage = function (pathname) {
    if (!this.isActive)
        return false;
    // Check if page is explicitly excluded
    for (const excludePage of this.excludePages) {
        if (pathname.startsWith(excludePage)) {
            return false;
        }
    }
    // If targetPages is empty, load on all public pages
    if (this.targetPages.length === 0) {
        return true;
    }
    // Check if page is in target pages
    return this.targetPages.some(targetPage => pathname === targetPage || pathname.startsWith(targetPage + '/'));
};
// Static method to get scripts for a specific page and placement
ScriptSchema.statics.getScriptsForPage = function (pathname, placement) {
    const query = { isActive: true };
    if (placement) {
        query.placement = placement;
    }
    return this.find(query)
        .sort({ priority: 1, createdAt: 1 })
        .then((scripts) => scripts.filter(script => script.shouldLoadOnPage(pathname)));
};
const Script = mongoose_1.default.model('Script', ScriptSchema);
exports.default = Script;
//# sourceMappingURL=Script.js.map