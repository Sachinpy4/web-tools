import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, 'Name is required'],
    trim: true,
  })
  name: string;

  @Prop({
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  })
  email: string;

  @Prop({
    required: [true, 'Password is required'],
    minlength: [6, 'Password should be at least 6 characters'],
    select: false, // By default, don't include password in queries
  })
  password: string;

  @Prop({
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  })
  role: string;

  // Method to compare password
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function (next) {
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

// Add the comparePassword method to the schema
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
}; 