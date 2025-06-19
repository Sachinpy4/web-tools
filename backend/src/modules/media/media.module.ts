import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaController } from './controllers/media.controller';
import { MediaService } from './services/media.service';
import { Media, MediaSchema } from './schemas/media.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
    ]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        limits: {
          fileSize: configService.get<number>('upload.maxFileSize') || 10 * 1024 * 1024, // 10MB default
          files: 10, // Max 10 files at once
        },
        fileFilter: (req, file, callback) => {
          // Allow images, videos, audio, and documents
          const allowedMimes = [
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            // Videos
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/webm',
            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
          ];

          if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error(`File type ${file.mimetype} is not allowed`), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {} 