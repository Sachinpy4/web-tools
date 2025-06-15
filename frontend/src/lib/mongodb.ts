import mongoose from 'mongoose'

// MongoDB connection string - use environment variable or fallback to local instance
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/webtools'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

// Track connection status
let isConnected = false

export async function dbConnect() {
  if (isConnected) {
    return
  }

  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    isConnected = true
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('MongoDB connection error:', error)
  }
}

export default dbConnect 