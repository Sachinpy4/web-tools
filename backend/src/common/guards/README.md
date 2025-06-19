# Dynamic Throttler Guard

This guard implements dynamic rate limiting based on database settings configured through the admin panel.

## Features

- **Dynamic Rate Limits**: Reads rate limit settings from the database in real-time
- **Route-Specific Limits**: Different limits for different types of operations:
  - Image processing: `imageProcessingMaxRequests` per `imageProcessingWindowMs`
  - Batch operations: `batchOperationMaxRequests` per `batchOperationWindowMs`  
  - General API: `apiMaxRequests` per `apiWindowMs`
- **Admin Configurable**: All limits can be changed through the admin settings panel
- **Immediate Effect**: Changes take effect immediately without server restart

## How It Works

1. **Settings Retrieval**: On each request, the guard fetches current settings from the database
2. **Route Detection**: Determines which rate limit to apply based on the request route
3. **Client Tracking**: Tracks requests per IP address
4. **Limit Enforcement**: Blocks requests that exceed the configured limits

## Configuration

Rate limits are configured through the admin panel in the Configuration section:

- **Image Processing Limits**: Controls compress, resize, convert, crop operations
- **Batch Operation Limits**: Controls batch processing operations
- **API Limits**: General fallback for other endpoints

## Usage

The guard is automatically applied to the Images controller:

```typescript
@Controller('images')
@UseGuards(DynamicThrottlerGuard)
export class ImagesController {
  // All endpoints are protected by dynamic rate limiting
}
```

## Storage

Currently uses in-memory storage for simplicity. In production, this should be replaced with Redis for:
- Persistence across server restarts
- Shared state in multi-instance deployments
- Better performance and scalability

## Rate Limit Headers

When a rate limit is exceeded, the guard returns:
- Status: 429 Too Many Requests
- Message: "Rate limit exceeded"

## Admin Impact

When admins change rate limit settings in the Configuration panel:
1. Settings are saved to the database ✅
2. Public endpoints return updated limits ✅  
3. ImageDropzone shows updated limits ✅
4. **Actual API enforcement uses new limits** ✅ (NEW!)

This ensures that the admin settings actually control the public tool behavior. 