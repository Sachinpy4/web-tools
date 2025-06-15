"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const seoController_1 = require("../controllers/seoController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public route for getting SEO data (used by frontend pages)
router.get('/page/:pagePath', seoController_1.getPageSeo);
// Protected admin routes
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.restrictTo)('admin'));
// Admin SEO management routes
router.get('/', seoController_1.getAllPageSeo);
router.post('/', seoController_1.createPageSeo);
router.put('/:id', seoController_1.updatePageSeo);
router.delete('/:id', seoController_1.deletePageSeo);
router.patch('/:id/toggle', seoController_1.togglePageSeoStatus);
// Initialize default SEO settings
router.post('/initialize', seoController_1.initializeDefaultSeo);
exports.default = router;
//# sourceMappingURL=seoRoutes.js.map