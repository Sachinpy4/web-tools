"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MediaSchema = new mongoose_1.default.Schema({
    filename: {
        type: String,
        required: [true, 'Filename is required'],
        trim: true,
    },
    originalname: {
        type: String,
        required: [true, 'Original name is required'],
        trim: true,
    },
    path: {
        type: String,
        required: [true, 'File path is required'],
    },
    url: {
        type: String,
        required: [true, 'URL is required'],
    },
    size: {
        type: Number,
        required: [true, 'File size is required'],
    },
    mimetype: {
        type: String,
        required: [true, 'MIME type is required'],
    },
    alt: {
        type: String,
        trim: true,
    },
    title: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    width: Number,
    height: Number,
    tags: [String],
    uploadedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Uploader information is required'],
    },
    uses: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Add text indexes for search
MediaSchema.index({
    originalname: 'text',
    alt: 'text',
    title: 'text',
    description: 'text',
    tags: 'text'
});
// Check if the model already exists to prevent recompilation error
const Media = mongoose_1.default.models.Media || mongoose_1.default.model('Media', MediaSchema);
exports.default = Media;
//# sourceMappingURL=Media.js.map