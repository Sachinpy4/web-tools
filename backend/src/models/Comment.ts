import mongoose from 'mongoose';

export interface IComment extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  blog: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | null; // Can be null for anonymous comments
  name: string;
  email: string;
  text: string;
  approved: boolean;
  ipAddress: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: mongoose.Types.ObjectId[]; // For nested comments/replies
  parent?: mongoose.Types.ObjectId; // If this is a reply to another comment
}

interface CommentModel extends mongoose.Model<IComment> {
  // Custom static methods would go here
}

const CommentSchema = new mongoose.Schema<IComment>(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: [true, 'Blog post reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot be more than 1000 characters'],
    },
    approved: {
      type: Boolean,
      default: false
    },
    ipAddress: {
      type: String,
      required: true
    },
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }],
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// Create compound index for IP address + blog post for limiting comments per IP
CommentSchema.index({ ipAddress: 1, blog: 1 });

// Check if the model already exists to prevent recompilation error
const Comment = mongoose.models.Comment || mongoose.model<IComment, CommentModel>('Comment', CommentSchema);

export default Comment; 