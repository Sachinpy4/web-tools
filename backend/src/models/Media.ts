import mongoose from 'mongoose';

export interface IMedia extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  filename: string;
  originalname: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
  alt?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  tags?: string[];
  uploadedBy: mongoose.Types.ObjectId;
  uses: number; // Track how many times the media is used
  createdAt: Date;
  updatedAt: Date;
}

interface MediaModel extends mongoose.Model<IMedia> {
  // Custom static methods would go here
}

const MediaSchema = new mongoose.Schema<IMedia>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    originalname: {
      type: String,
      required: [true, 'Original name is required'],
      trim: true,
    },
    path: {
      type: String,
      required: [true, 'File path is required'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimetype: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    alt: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    width: Number,
    height: Number,
    tags: [String],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader information is required'],
    },
    uses: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add text indexes for search
MediaSchema.index({ 
  originalname: 'text', 
  alt: 'text', 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

// Check if the model already exists to prevent recompilation error
const Media = mongoose.models.Media || mongoose.model<IMedia, MediaModel>('Media', MediaSchema);

export default Media; 