import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterDto, LoginDto, UpdateUserDto, UpdatePasswordDto } from '../dto/auth.dto';
import { JwtPayload } from '../strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto) {
    const { name, email, password, role = 'user' } = registerDto;

    // Check if user already exists
    const userExists = await this.userModel.findOne({ email });
    if (userExists) {
      throw new ConflictException('User already exists');
    }

    // Create new user
    const user = await this.userModel.create({
      name,
      email,
      password,
      role,
    });

    // Generate JWT token
    const token = this.generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      status: 'success',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    };
  }

  /**
   * Login a user with enhanced security and brute force protection
   */
  async login(loginDto: LoginDto, requestInfo?: { ip?: string; userAgent?: string }) {
    const { email, password } = loginDto;

    // Additional validation for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please provide a valid email address');
    }

    // Find user in database (include password and security fields for comparison)
    const user = await this.userModel.findOne({ email }).select('+password +failedLoginAttempts +accountLockedUntil +lastFailedLogin');
    
    // Always perform password comparison to prevent timing attacks
    const dummyPassword = '$2b$10$dummyHashToPreventTimingAttacks';
    
    if (!user) {
      // Perform dummy password comparison to prevent timing attacks
      await bcrypt.compare(password, dummyPassword);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const lockoutEndTime = user.accountLockedUntil.getTime();
      const currentTime = Date.now();
      const retryAfter = Math.ceil((lockoutEndTime - currentTime) / 1000);
      
      // Throw error with code in the message field to match frontend expectations
      throw new UnauthorizedException({
        code: 'ACCOUNT_LOCKED',
        retryAfter,
        lockoutEndTime,
        message: 'Account temporarily locked due to multiple failed login attempts',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      // Increment failed attempts manually
      let failedAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // If we have a previous failed attempt, check if it's within the lockout window
      if (user.lastFailedLogin) {
        const timeSinceLastAttempt = Date.now() - user.lastFailedLogin.getTime();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        // Reset attempts if it's been more than 1 hour since last failed attempt
        if (timeSinceLastAttempt > oneHour) {
          failedAttempts = 1; // Reset to 1 (this current attempt)
        }
      }

      // Update failed attempt fields
      user.failedLoginAttempts = failedAttempts;
      user.lastFailedLogin = new Date();
      
      // Lock account after 3 failed attempts (changed from 5)
      if (failedAttempts >= 3) {
        const lockoutTime = 30 * 60 * 1000; // 30 minutes (changed from 15)
        user.accountLockedUntil = new Date(Date.now() + lockoutTime);
        await user.save();
        
        const retryAfter = Math.ceil(lockoutTime / 1000);
        
        throw new UnauthorizedException({
          code: 'ACCOUNT_LOCKED_AFTER_ATTEMPTS',
          retryAfter,
          lockoutEndTime: user.accountLockedUntil.getTime(),
          message: 'Account locked due to multiple failed login attempts',
        });
      } else {
        // Save failed attempt but don't lock yet
        await user.save();
      }
      
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login - reset failed attempts and update login info
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;
    user.accountLockedUntil = null;
    user.lastSuccessfulLogin = new Date();
    
    if (requestInfo?.ip) {
      user.lastLoginIP = requestInfo.ip;
    }
    
    await user.save();

    // Generate token
    const token = this.generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      status: 'success',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
        lastLoginTime: user.lastSuccessfulLogin,
      },
    };
  }

  /**
   * Get current user profile
   */
  async getMe(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      status: 'success',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    const users = await this.userModel.find().select('-password');
    
    return {
      status: 'success',
      data: users,
    };
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userModel.findOne({ email: updateUserDto.email });
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      updateUserDto,
      { new: true, runValidators: true }
    );

    return {
      status: 'success',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    };
  }

  /**
   * Update user password (admin only)
   */
  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = updatePasswordDto.password;
    await user.save();

    return {
      status: 'success',
      message: 'Password updated successfully',
    };
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndDelete(userId);

    return {
      status: 'success',
      message: 'User deleted successfully',
    };
  }

  /**
   * Unlock user account (admin only)
   */
  async unlockUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Reset all lockout fields
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;
    user.accountLockedUntil = null;
    await user.save();

    console.log(`🔓 Account unlocked for user ${user.email} by admin`);

    return {
      status: 'success',
      message: 'User account unlocked successfully',
      data: {
        id: user._id,
        email: user.email,
        unlockedAt: new Date(),
      },
    };
  }

  /**
   * Get user security status (admin only)
   */
  async getUserSecurityStatus(userId: string) {
    const user = await this.userModel.findById(userId).select('+failedLoginAttempts +lastFailedLogin +accountLockedUntil +lastSuccessfulLogin +lastLoginIP');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentlyLocked = user.accountLockedUntil && user.accountLockedUntil > new Date();
    const lockoutEndsAt = isCurrentlyLocked ? user.accountLockedUntil : null;

    return {
      status: 'success',
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        securityStatus: {
          failedLoginAttempts: user.failedLoginAttempts || 0,
          lastFailedLogin: user.lastFailedLogin,
          isAccountLocked: isCurrentlyLocked,
          accountLockedUntil: lockoutEndsAt,
          lastSuccessfulLogin: user.lastSuccessfulLogin,
          lastLoginIP: user.lastLoginIP,
        },
      },
    };
  }

  /**
   * Unlock user account by email (development only)
   */
  async unlockUserByEmail(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Reset all lockout fields
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;
    user.accountLockedUntil = null;
    await user.save();

    console.log(`🔓 [DEV] Account unlocked for ${user.email} via development endpoint`);

    return {
      status: 'success',
      message: 'User account unlocked successfully',
      data: {
        id: user._id,
        email: user.email,
        unlockedAt: new Date(),
      },
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
  }
} 