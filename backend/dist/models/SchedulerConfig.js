"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schedulerConfigSchema = new mongoose_1.default.Schema({
    type: {
        type: String,
        enum: ['images', 'logs', 'cache', 'database', 'memory'],
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: false,
        required: true
    },
    hour: {
        type: Number,
        min: 0,
        max: 23,
        required: true
    },
    minute: {
        type: Number,
        min: 0,
        max: 59,
        required: true
    },
    lastRun: {
        type: Date,
        default: null
    },
    nextRun: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});
// Index for efficient queries
schedulerConfigSchema.index({ type: 1 });
schedulerConfigSchema.index({ enabled: 1 });
const SchedulerConfig = mongoose_1.default.model('SchedulerConfig', schedulerConfigSchema);
exports.default = SchedulerConfig;
//# sourceMappingURL=SchedulerConfig.js.map