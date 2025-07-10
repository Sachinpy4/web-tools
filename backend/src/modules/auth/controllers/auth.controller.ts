import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { GetUser } from '../decorators/get-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { UserDocument } from '../schemas/user.schema';
import {
  RegisterDto,
  LoginDto,
  UpdateUserDto,
  UpdatePasswordDto,
  AuthResponseDto,
  UserResponseDto,
  UsersListResponseDto,
} from '../dto/auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes for IP-based protection
  @ApiOperation({ summary: 'Login a user with enhanced security and brute force protection (Account locks after 3 failed attempts for 30 minutes)' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked (3 failed attempts = 30min lockout)' })
  @ApiResponse({ status: 429, description: 'Too many login attempts from this IP' })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    // Extract request information for security tracking
    const requestInfo = {
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    return this.authService.login(loginDto, requestInfo);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@GetUser() user: UserDocument) {
    return this.authService.getMe(user._id.toString());
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: UsersListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(userId, updateUserDto);
  }

  @Put('users/:id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user password (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePassword(
    @Param('id') userId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(userId, updatePasswordDto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') userId: string) {
    return this.authService.deleteUser(userId);
  }

  @Post('users/:id/unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock user account (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User account successfully unlocked',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unlockUser(@Param('id') userId: string) {
    return this.authService.unlockUser(userId);
  }

  @Get('users/:id/security-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user security status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User security status retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserSecurityStatus(@Param('id') userId: string) {
    return this.authService.getUserSecurityStatus(userId);
  }

  @Post('setup-admin')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 1, ttl: 86400000 } }) // 1 attempt per day per IP
  @ApiOperation({ 
    summary: 'Create initial admin user (Only works if no admin exists)',
    description: 'This endpoint can only be used once to create the first admin user. It will fail if any admin user already exists in the system. Limited to development/staging environments.'
  })
  @ApiResponse({
    status: 201,
    description: 'Admin user successfully created',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 403, description: 'Admin user already exists or production environment' })
  @ApiResponse({ status: 429, description: 'Too many setup attempts' })
  async setupAdmin(@Body() registerDto: RegisterDto) {
    // Block in production environment
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException(
        {
          status: 'error',
          message: 'Admin setup is not allowed in production environment',
          code: 'PRODUCTION_BLOCKED'
        },
        HttpStatus.FORBIDDEN
      );
    }

    // Check if any admin user already exists
    const existingAdmin = await this.userModel.findOne({ role: 'admin' });
    if (existingAdmin) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Admin user already exists. This endpoint can only be used for initial setup.',
          code: 'ADMIN_EXISTS'
        },
        HttpStatus.FORBIDDEN
      );
    }

    // Force role to admin for this endpoint
    const adminData = { ...registerDto, role: 'admin' };
    
    return this.authService.register(adminData);
  }

  @Post('dev/unlock-by-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Unlock account by email (Development only)',
    description: 'Development endpoint to unlock accounts by email for testing purposes.'
  })
  @ApiResponse({
    status: 200,
    description: 'Account unlocked successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Not allowed in production' })
  async unlockByEmail(@Body('email') email: string) {
    // Block in production environment
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException(
        {
          status: 'error',
          message: 'Development endpoints not allowed in production',
          code: 'PRODUCTION_BLOCKED'
        },
        HttpStatus.FORBIDDEN
      );
    }

    return this.authService.unlockUserByEmail(email);
  }
} 