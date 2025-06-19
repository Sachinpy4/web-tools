import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type SchedulerConfigDocument = SchedulerConfig & Document;

@Schema({ timestamps: true })
export class SchedulerConfig {
  @Prop({
    type: String,
    enum: ['images', 'logs', 'cache', 'database', 'memory'],
    required: true,
    unique: true,
  })
  @ApiProperty({
    description: 'Type of scheduled task',
    enum: ['images', 'logs', 'cache', 'database', 'memory'],
    example: 'images',
  })
  type: string;

  @Prop({
    type: Boolean,
    default: false,
    required: true,
  })
  @ApiProperty({
    description: 'Whether the scheduled task is enabled',
    example: true,
  })
  enabled: boolean;

  @Prop({
    type: Number,
    min: 0,
    max: 23,
    required: true,
  })
  @ApiProperty({
    description: 'Hour to run the task (0-23)',
    minimum: 0,
    maximum: 23,
    example: 2,
  })
  hour: number;

  @Prop({
    type: Number,
    min: 0,
    max: 59,
    required: true,
  })
  @ApiProperty({
    description: 'Minute to run the task (0-59)',
    minimum: 0,
    maximum: 59,
    example: 30,
  })
  minute: number;

  @Prop({
    type: Date,
    default: null,
  })
  @ApiProperty({
    description: 'Last time the task was executed',
    example: '2024-01-15T02:30:00.000Z',
    required: false,
  })
  lastRun?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  @ApiProperty({
    description: 'Next scheduled execution time',
    example: '2024-01-16T02:30:00.000Z',
    required: false,
  })
  nextRun?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export const SchedulerConfigSchema = SchemaFactory.createForClass(SchedulerConfig);

// Create indexes for efficient queries (same as original)
// Note: type field already has unique index from @Prop decorator, so no need to duplicate
SchedulerConfigSchema.index({ enabled: 1 });
SchedulerConfigSchema.index({ nextRun: 1 }); 