import express from 'express';
import * as monitoringController from '../controllers/monitoringController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Restrict to admin role
router.use(restrictTo('admin'));

// Monitoring routes
router.get('/tool-usage', monitoringController.getToolUsageStats);
router.get('/system-health', monitoringController.getSystemHealth);
router.get('/circuit-breakers', monitoringController.getCircuitBreakerStatus);
router.get('/load-balancer', monitoringController.getLoadBalancerStatus);

// Test endpoint for circuit breaker
router.post('/test-mongodb-breaker', monitoringController.testMongoDBBreaker);

export default router;
