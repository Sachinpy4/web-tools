"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController = __importStar(require("../controllers/adminController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes (no auth required for read-only settings)
router.get('/settings/rate-limits', adminController.getRateLimitSettings);
router.get('/settings/file-upload', adminController.getFileUploadSettings);
// Apply authentication to all other routes
router.use(authMiddleware_1.protect);
// Restrict to admin role
router.use((0, authMiddleware_1.restrictTo)('admin'));
// Cleanup routes
router.post('/cleanup-images', adminController.cleanupImages);
router.post('/cleanup-system', adminController.cleanupSystem);
router.post('/setup-scheduler', adminController.setupScheduler);
router.get('/scheduler-status', adminController.getSchedulerStatus);
router.get('/system-status', adminController.getSystemStatus);
// Settings routes (admin only)
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map