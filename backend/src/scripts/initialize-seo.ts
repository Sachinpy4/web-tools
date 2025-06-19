import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeoService } from '../modules/seo/services/seo.service';

async function initializeSeoData() {
  console.log('🔍 Initializing SEO data...');
  
  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get the SEO service
    const seoService = app.get(SeoService);
    
    // Initialize default SEO settings
    const result = await seoService.initializeDefaultSeo({ overwrite: false });
    
    console.log('✅ SEO initialization completed:');
    console.log(`   - Created: ${result.data.created} pages`);
    console.log(`   - Already existed: ${result.data.existing} pages`);
    console.log(`   - Total: ${result.data.total} pages`);
    
    // Close the application context
    await app.close();
    
    console.log('🎉 SEO data initialization finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize SEO data:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeSeoData(); 