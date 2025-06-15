import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Define interfaces for mongoose schema typing
export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  comparePassword(candidatePassword: string): Promise<boolean>;
  isModified(path: string): boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define a type for "this" in schema methods/hooks
interface UserModel extends mongoose.Model<IUser> {
  // Custom static methods would go here
}

const UserSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password should be at least 6 characters'],
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(this: IUser, next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the model
const User = mongoose.model<IUser, UserModel>('User', UserSchema);
export default User; 