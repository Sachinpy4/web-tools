"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBreaker = createBreaker;
exports.getBreaker = getBreaker;
exports.getCircuitBreakerStats = getCircuitBreakerStats;
const opossum_1 = __importDefault(require("opossum"));
const logger_1 = __importDefault(require("./logger"));
// Default circuit breaker options
const DEFAULT_OPTIONS = {
    resetTimeout: 30000, // After 30 seconds, try again
    timeout: 10000, // Consider a request failed if it takes longer than 10 seconds
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    rollingCountTimeout: 60000, // Keep statistics for the last minute
    rollingCountBuckets: 10, // Split statistics into 10 buckets (6 seconds each)
};
// Store all circuit breakers
const breakers = new Map();
/**
 * Create a circuit breaker for a specific service
 * @param name Name of the service
 * @param fn The function to execute
 * @param options Optional circuit breaker options
 */
function createBreaker(name, fn, options = {}) {
    if (breakers.has(name)) {
        return breakers.get(name);
    }
    const breaker = new opossum_1.default(fn, {
        ...DEFAULT_OPTIONS,
        ...options,
        name,
    });
    // Add event handlers
    breaker.on('open', () => {
        logger_1.default.warn(`Circuit breaker for ${name} is now OPEN`);
    });
    breaker.on('halfOpen', () => {
        logger_1.default.info(`Circuit breaker for ${name} is now HALF-OPEN`);
    });
    breaker.on('close', () => {
        logger_1.default.info(`Circuit breaker for ${name} is now CLOSED`);
    });
    breaker.on('fallback', (result) => {
        logger_1.default.info(`Circuit breaker for ${name} fallback executed`);
    });
    breaker.on('timeout', (result) => {
        logger_1.default.warn(`Call to ${name} timed out after ${DEFAULT_OPTIONS.timeout}ms`);
    });
    breaker.on('reject', () => {
        logger_1.default.warn(`Circuit breaker for ${name} rejected the call`);
    });
    breaker.on('success', () => {
        logger_1.default.debug(`Call to ${name} was successful`);
    });
    breaker.on('failure', (error) => {
        logger_1.default.error(`Call to ${name} failed: ${error.message}`);
    });
    // Store the breaker for reuse
    breakers.set(name, breaker);
    return breaker;
}
/**
 * Get an existing circuit breaker by name
 * @param name Name of the service
 */
function getBreaker(name) {
    return breakers.get(name);
}
/**
 * Get the state of all circuit breakers
 */
function getCircuitBreakerStats() {
    const stats = {};
    breakers.forEach((breaker, name) => {
        // Fix the stats object to ensure it has the proper structure
        const breakerStats = breaker.stats;
        stats[name] = {
            state: breaker.status.toString(),
            stats: {
                successes: typeof breakerStats.successes === 'number' ? breakerStats.successes : 0,
                failures: typeof breakerStats.failures === 'number' ? breakerStats.failures : 0,
                timeouts: typeof breakerStats.timeouts === 'number' ? breakerStats.timeouts : 0,
                rejects: typeof breakerStats.rejects === 'number' ? breakerStats.rejects : 0
            }
        };
    });
    // If no circuit breakers exist, add the MongoDB one with default stats
    // This ensures we always have at least one circuit breaker to display
    if (Object.keys(stats).length === 0) {
        stats['mongodb'] = {
            state: 'closed',
            stats: {
                successes: 0,
                failures: 0,
                timeouts: 0,
                rejects: 0
            }
        };
    }
    return stats;
}
//# sourceMappingURL=circuitBreaker.js.map