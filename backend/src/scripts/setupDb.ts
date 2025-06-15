import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection string - use the IP address instead of localhost
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/web-tools';

async function setupDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create admin user
    const adminPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Define the schema inline for this script
    const UserSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
    }, { timestamps: true });

    // Create a model
    const User = mongoose.model('User', UserSchema);

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }

    console.log('Admin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Database setup completed');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

// Run the setup
setupDatabase(); 