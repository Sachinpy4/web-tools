// Blog post interface
export interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  status: string;
  author: { name: string; email: string } | string;
  category: string;
  tags: string[];
  featuredImage?: string;
  views: number;
  likes: number;
  readingTime?: string;
  slug: string;
  // SEO metadata fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  // Comment settings
  commentsEnabled?: boolean;
  requireCommentApproval?: boolean;
  limitCommentsPerIp?: boolean;
}

// Heading information for table of contents
export interface HeadingInfo {
  id: string;
  text: string;
  level: number;
}

// Comment interface
export interface Comment {
  _id: string;
  text: string;
  name: string;
  email: string;
  approved: boolean;
  ipAddress: string;
  createdAt: string;
  replies?: Comment[];
} 