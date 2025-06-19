#!/usr/bin/env node

/**
 * Simple admin creation script using environment variables
 * This can be run in production environments where you have access to environment variables
 * but may not want to run the full NestJS application context
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User schema (simplified version matching the NestJS schema)
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    // Get database connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-tools';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get admin details from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email:', adminEmail);
      console.log('🔐 Use your existing password to login');
    } else {
      // Create new admin user
      const adminUser = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });

      await adminUser.save();
      
      console.log('✅ Admin user created successfully!');
      console.log('📋 Admin credentials:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role: admin`);
      console.log('');
      console.log('⚠️  IMPORTANT: Please change the default password after first login!');
    }

    // Close connection
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Admin creation failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--email=')) {
      process.env.ADMIN_EMAIL = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      process.env.ADMIN_PASSWORD = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      process.env.ADMIN_NAME = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node create-admin-env.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  --email=EMAIL       Admin email (default: admin@example.com)');
      console.log('  --password=PASSWORD Admin password (default: admin123)');
      console.log('  --name=NAME         Admin name (default: Admin User)');
      console.log('');
      console.log('Environment variables:');
      console.log('  ADMIN_EMAIL         Admin email');
      console.log('  ADMIN_PASSWORD      Admin password');
      console.log('  ADMIN_NAME          Admin name');
      console.log('  MONGODB_URI         MongoDB connection string');
      process.exit(0);
    }
  });
  
  createAdmin();
} 