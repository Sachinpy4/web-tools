"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const PageSeo_1 = __importDefault(require("../models/PageSeo"));
const logger_1 = __importDefault(require("../utils/logger"));
const defaultPages = [
    {
        pagePath: '/',
        pageType: 'homepage',
        pageName: 'Homepage',
        metaTitle: 'ToolsCandy - Free Image Processing Tools for Everyone',
        metaDescription: 'Free, powerful image processing tools that work right in your browser. Compress, resize, convert, and crop images with complete privacy. No uploads required.',
        metaKeywords: ['ToolsCandy', 'image tools', 'image optimization', 'image compression', 'image resize', 'browser tools', 'privacy'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 1
    },
    {
        pagePath: '/blog',
        pageType: 'blog-listing',
        pageName: 'Blog',
        metaTitle: 'ToolsCandy Blog - Image Processing Tips & Tutorials',
        metaDescription: 'Expert tips, tutorials, and insights about image optimization, web performance, and browser-based image processing. Learn from the pros.',
        metaKeywords: ['ToolsCandy blog', 'image optimization tips', 'image processing tutorials', 'web performance', 'browser tools'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 2
    },
    {
        pagePath: '/image/compress',
        pageType: 'tool',
        pageName: 'Image Compression Tool',
        metaTitle: 'Free Image Compression Tool - Reduce Image Size Online',
        metaDescription: 'Compress your images without losing quality. Our free online tool reduces image file size by up to 80% while maintaining visual quality.',
        metaKeywords: ['image compression', 'compress images online', 'reduce image size', 'optimize images', 'free image compressor'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 3
    },
    {
        pagePath: '/image/resize',
        pageType: 'tool',
        pageName: 'Image Resize Tool',
        metaTitle: 'Free Image Resize Tool - Resize Images Online',
        metaDescription: 'Resize your images to any dimension with our free online tool. Maintain aspect ratio and quality while adjusting image dimensions.',
        metaKeywords: ['image resize', 'resize images online', 'change image size', 'image dimensions', 'free image resizer'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 4
    },
    {
        pagePath: '/image/convert',
        pageType: 'tool',
        pageName: 'Image Format Converter',
        metaTitle: 'Free Image Format Converter - Convert Images Online',
        metaDescription: 'Convert images between formats like JPG, PNG, WebP, and more. Free online tool with high-quality conversion and batch processing.',
        metaKeywords: ['image converter', 'convert images online', 'image format converter', 'jpg to png', 'webp converter'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 5
    },
    {
        pagePath: '/image/crop',
        pageType: 'tool',
        pageName: 'Image Crop Tool',
        metaTitle: 'Free Image Crop Tool - Crop Images Online',
        metaDescription: 'Crop your images with precision using our free online tool. Remove unwanted areas and focus on what matters most.',
        metaKeywords: ['image crop', 'crop images online', 'image editor', 'crop tool', 'free image cropper'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 6
    },
    {
        pagePath: '/image/metadata',
        pageType: 'tool',
        pageName: 'Image Metadata Analyzer',
        metaTitle: 'Free Image Metadata Analyzer - Extract EXIF & Image Data Online',
        metaDescription: 'Analyze image metadata, extract EXIF data, and view technical specifications. Free online image metadata analyzer with comprehensive insights. Privacy-focused.',
        metaKeywords: ['image metadata', 'EXIF data', 'image analyzer', 'image properties', 'metadata extractor', 'image information', 'technical specifications', 'photo metadata'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 7
    },
    {
        pagePath: '/about',
        pageType: 'about',
        pageName: 'About Us',
        metaTitle: 'About ToolsCandy - Making Image Processing Sweet & Simple',
        metaDescription: 'Learn about ToolsCandy\'s mission to provide free, privacy-focused image processing tools that work entirely in your browser. No uploads, complete privacy.',
        metaKeywords: ['ToolsCandy about', 'privacy-focused tools', 'browser image processing', 'no upload tools', 'free image tools'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 7
    },
    {
        pagePath: '/privacy',
        pageType: 'custom',
        pageName: 'Privacy Policy',
        metaTitle: 'Privacy Policy - ToolsCandy Protects Your Data',
        metaDescription: 'ToolsCandy\'s comprehensive privacy policy. Learn how we protect your privacy with browser-based processing and no data collection.',
        metaKeywords: ['ToolsCandy privacy', 'privacy policy', 'data protection', 'browser processing', 'no data collection'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 8
    },
    {
        pagePath: '/terms',
        pageType: 'custom',
        pageName: 'Terms of Service',
        metaTitle: 'Terms of Service - ToolsCandy Fair Usage Terms',
        metaDescription: 'ToolsCandy\'s terms of service. Clear, fair terms for using our free image processing tools responsibly.',
        metaKeywords: ['ToolsCandy terms', 'terms of service', 'usage terms', 'free tool terms', 'fair usage'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 9
    },
    {
        pagePath: '/contact',
        pageType: 'custom',
        pageName: 'Contact Us',
        metaTitle: 'Contact ToolsCandy - Get Help & Share Feedback',
        metaDescription: 'Contact ToolsCandy for support, feedback, or questions. We\'re here to help with our image processing tools and answer your questions.',
        metaKeywords: ['ToolsCandy contact', 'support', 'feedback', 'help', 'customer service'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 10
    },
    {
        pagePath: '/disclaimer',
        pageType: 'custom',
        pageName: 'Disclaimer',
        metaTitle: 'Disclaimer - Important Information About ToolsCandy',
        metaDescription: 'Important disclaimer and usage information for ToolsCandy\'s image processing tools. Use responsibly and understand the limitations.',
        metaKeywords: ['ToolsCandy disclaimer', 'usage disclaimer', 'tool limitations', 'responsible use', 'important information'],
        ogType: 'website',
        twitterCard: 'summary_large_image',
        priority: 11
    }
];
async function initializeSeoSettings() {
    try {
        // Connect to database
        await (0, database_1.connectDB)();
        let created = 0;
        let existing = 0;
        for (const pageData of defaultPages) {
            const existingPage = await PageSeo_1.default.findOne({ pagePath: pageData.pagePath });
            if (!existingPage) {
                await PageSeo_1.default.create(pageData);
                logger_1.default.info(`Created SEO settings for: ${pageData.pagePath}`);
                created++;
            }
            else {
                logger_1.default.info(`SEO settings already exist for: ${pageData.pagePath}`);
                existing++;
            }
        }
        logger_1.default.info(`SEO initialization complete: ${created} created, ${existing} already existed`);
        console.log(`✅ SEO initialization complete: ${created} created, ${existing} already existed`);
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error initializing SEO settings:', error);
        console.error('❌ Error initializing SEO settings:', error);
        process.exit(1);
    }
}
// Run the script
initializeSeoSettings();
//# sourceMappingURL=initializeSeo.js.map