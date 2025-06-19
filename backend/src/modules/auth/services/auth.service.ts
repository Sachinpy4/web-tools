import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterDto, LoginDto, UpdateUserDto, UpdatePasswordDto } from '../dto/auth.dto';
import { JwtPayload } from '../strategies/jwt.strategy';

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
   * Login a user with enhanced security
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Additional validation for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please provide a valid email address');
    }

    // Find user in database (include password for comparison)
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
   * Generate JWT token
   */
  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
  }
} 