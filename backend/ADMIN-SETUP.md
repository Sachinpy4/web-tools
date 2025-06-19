# 🔐 Admin User Setup Guide

After deploying your NestJS backend to production, you'll need to create an initial admin user to access the admin panel. This guide provides multiple methods to create the admin user.

## 📋 Prerequisites

- Backend deployed and running
- Database (MongoDB) accessible
- Environment variables configured

## 🚀 Method 1: API Endpoint (Recommended for EasyPanel)

### One-Time Setup Endpoint

The backend includes a special endpoint that can only be used once to create the initial admin user.

**Endpoint:** `POST /api/auth/setup-admin`

**Usage:**
```bash
curl -X POST https://your-domain.com/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@yourdomain.com",
    "password": "your-secure-password"
  }'
```

**Features:**
- ✅ **One-time use only** - Fails if any admin already exists
- ✅ **Rate limited** - 3 attempts per hour
- ✅ **Secure** - Forces role to 'admin'
- ✅ **Web accessible** - Works from any HTTP client

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@yourdomain.com",
    "role": "admin",
    "token": "jwt_token"
  }
}
```

## 🛠️ Method 2: NPM Scripts (Server Access Required)

### Option A: Full NestJS Context
```bash
# Production
npm run setup:admin

# Development
npm run setup:admin:dev

# With custom credentials
ADMIN_EMAIL=admin@mydomain.com ADMIN_PASSWORD=mypassword npm run setup:admin
```

### Option B: Lightweight Environment Script
```bash
# Production
npm run setup:admin:env

# Development
npm run setup:admin:env:dev

# With command line arguments
npm run setup:admin:env -- --email=admin@mydomain.com --password=mypassword --name="My Admin"
```

## 🌍 Method 3: Environment Variables

Set these environment variables before running the setup scripts:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/web-tools

# Optional (defaults provided)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
```

## 🐳 Method 4: Docker/EasyPanel Environment

### For EasyPanel Deployment:

1. **Set Environment Variables in EasyPanel:**
   ```
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=your-secure-password
   ADMIN_NAME=Your Admin Name
   ```

2. **Run Setup via EasyPanel Console:**
   ```bash
   npm run setup:admin:env
   ```

3. **Or use the API endpoint from your browser:**
   ```
   POST https://your-app.easypanel.host/api/auth/setup-admin
   ```

## 📱 Method 5: Frontend Integration

You can create a setup page in your frontend that calls the setup endpoint:

```javascript
// Frontend setup form
const setupAdmin = async (adminData) => {
  try {
    const response = await fetch('/api/auth/setup-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Admin created:', result);
      // Redirect to login or admin panel
    } else {
      const error = await response.json();
      console.error('Setup failed:', error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## 🔒 Security Considerations

### Default Credentials
- **Default Email:** `admin@example.com`
- **Default Password:** `admin123`
- **⚠️ CHANGE THESE IMMEDIATELY IN PRODUCTION!**

### Best Practices
1. **Use strong passwords** (minimum 8 characters, mixed case, numbers, symbols)
2. **Use your domain email** for admin account
3. **Change default password** immediately after first login
4. **Disable setup endpoint** after initial setup (it auto-disables when admin exists)
5. **Use environment variables** for sensitive data

## 🐛 Troubleshooting

### Common Issues

**1. "Admin user already exists"**
```bash
# Check existing admin users
curl https://your-domain.com/api/auth/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**2. "Database connection failed"**
- Verify `MONGODB_URI` environment variable
- Check database server is running
- Verify network connectivity

**3. "Setup endpoint not working"**
- Ensure backend is running
- Check API endpoint: `https://your-domain.com/api/auth/setup-admin`
- Verify Content-Type header is set

**4. "Permission denied"**
- Ensure you have server access for script methods
- Use API endpoint method instead

## 📞 Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure database connectivity
4. Try the API endpoint method as a fallback

## 🎯 Quick Start for EasyPanel

**Fastest method for EasyPanel deployment:**

1. Deploy your app to EasyPanel
2. Open your app URL: `https://your-app.easypanel.host`
3. Use a tool like Postman or curl:
   ```bash
   curl -X POST https://your-app.easypanel.host/api/auth/setup-admin \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Your Name",
       "email": "admin@yourdomain.com", 
       "password": "your-secure-password"
     }'
   ```
4. Login to admin panel with your credentials
5. Change password in admin settings

✅ **Done! Your admin user is ready.** 