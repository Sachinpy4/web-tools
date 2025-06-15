"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scriptsController_1 = require("../controllers/scriptsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public route - Get scripts for a specific page
router.get('/public', scriptsController_1.getScriptsForPage);
// Admin routes (require authentication)
router.get('/', authMiddleware_1.protect, scriptsController_1.getAllScripts);
router.post('/', authMiddleware_1.protect, scriptsController_1.createScript);
router.put('/:id', authMiddleware_1.protect, scriptsController_1.updateScript);
router.delete('/:id', authMiddleware_1.protect, scriptsController_1.deleteScript);
router.patch('/:id/toggle', authMiddleware_1.protect, scriptsController_1.toggleScriptStatus);
exports.default = router;
//# sourceMappingURL=scripts.js.map