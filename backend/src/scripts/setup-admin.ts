import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/services/auth.service';
import { Logger } from '@nestjs/common';

async function setupAdmin() {
  const logger = new Logger('AdminSetup');
  
  try {
    // Create NestJS application context
    logger.log('🚀 Starting admin setup...');
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get AuthService
    const authService = app.get(AuthService);
    
    // Admin user details - you can modify these or pass via environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    
    logger.log(`📧 Creating admin user with email: ${adminEmail}`);
    
    try {
      // Try to create admin user
      const result = await authService.register({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      
      logger.log('✅ Admin user created successfully!');
      logger.log('📋 Admin credentials:');
      logger.log(`   Email: ${adminEmail}`);
      logger.log(`   Password: ${adminPassword}`);
      logger.log(`   Role: admin`);
      logger.log('');
      logger.log('⚠️  IMPORTANT: Please change the default password after first login!');
      
    } catch (error: any) {
      if (error.message.includes('User already exists')) {
        logger.warn('⚠️  Admin user already exists!');
        logger.log('📋 Use these credentials to login:');
        logger.log(`   Email: ${adminEmail}`);
        logger.log(`   Password: ${adminPassword} (if unchanged)`);
      } else {
        throw error;
      }
    }
    
    // Close the application context
    await app.close();
    logger.log('✅ Admin setup completed');
    
  } catch (error) {
    console.error('❌ Admin setup failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments for custom admin details
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
    }
  });
  
  setupAdmin();
} 