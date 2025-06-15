"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    let error = { ...err };
    error.message = err.message;
    // Handle specific error types
    // Mongoose bad ObjectId
    if (err instanceof mongoose_1.default.Error.CastError) {
        // Use type assertion for mongoose specific error
        const castError = err;
        const message = `Resource not found with id of ${castError.value}`;
        error = new Error(message);
        error.statusCode = 404;
    }
    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        const message = `Duplicate field value: ${field}. Please use another value`;
        error = new Error(message);
        error.statusCode = 400;
    }
    // Mongoose validation error
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        // Use type assertion for mongoose specific error
        const validationError = err;
        const message = Object.values(validationError.errors)
            .map((val) => val.message)
            .join(', ');
        error = new Error(message);
        error.statusCode = 400;
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new Error('Invalid token. Please log in again.');
        error.statusCode = 401;
    }
    if (err.name === 'TokenExpiredError') {
        error = new Error('Your token has expired. Please log in again.');
        error.statusCode = 401;
    }
    const statusCode = error.statusCode || 500;
    const status = error.status || 'error';
    res.status(statusCode).json({
        status,
        message: error.message || 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map