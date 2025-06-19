import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: ['user', 'admin'],
    default: 'user',
  })
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
  })
  @IsString()
  password: string;
}

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john.smith@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: ['user', 'admin'],
  })
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'User data and token',
  })
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    token: string;
  };
}

export class UserResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'User data',
  })
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class UsersListResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'List of users',
  })
  data: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
} 