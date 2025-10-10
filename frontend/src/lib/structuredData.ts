/**
 * JSON-LD Structured Data Generators
 * For rich results in Google Search
 */

export interface BlogPost {
  title: string
  slug: string
  excerpt: string
  content: string
  date: string
  updatedAt: string
  author: {
    name: string
    email?: string
  } | string
  category: string
  tags?: string[]
  featuredImage?: string
  metaTitle?: string
  metaDescription?: string
}

/**
 * Organization Schema (for homepage/footer)
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ToolsCandy',
    alternateName: 'Tools Candy',
    url: 'https://toolscandy.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://toolscandy.com/logo.svg',
      width: 200,
      height: 200,
    },
    description: 'Free image processing tools that work right in your browser with complete privacy',
    email: 'contact@toolscandy.com',
    sameAs: [
      // Add your social media URLs here
      // 'https://twitter.com/toolscandy',
      // 'https://github.com/toolscandy',
      // 'https://facebook.com/toolscandy',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://toolscandy.com/contact',
      availableLanguage: ['English'],
    },
    foundingDate: '2024',
    keywords: 'image tools, image compression, image resize, image converter, browser tools, privacy-focused',
  }
}

/**
 * WebSite Schema (for homepage)
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ToolsCandy',
    url: 'https://toolscandy.com',
    description: 'Free, powerful image processing tools that work right in your browser',
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://toolscandy.com/blog?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * SoftwareApplication Schema (for tool pages)
 */
export function generateToolSchema(toolInfo: {
  name: string
  description: string
  url: string
  features: string[]
  category?: string
  screenshot?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: toolInfo.name,
    applicationCategory: toolInfo.category || 'MultimediaApplication',
    operatingSystem: 'Any (Browser-based)',
    description: toolInfo.description,
    url: toolInfo.url,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: toolInfo.features,
    screenshot: toolInfo.screenshot,
    browserRequirements: 'Requires JavaScript. Modern browser recommended.',
    softwareVersion: '1.0',
    applicationSubCategory: 'Image Processing Tool',
    permissions: 'No registration required',
  }
}

/**
 * Article Schema (for blog posts)
 */
export function generateArticleSchema(post: BlogPost) {
  const authorName = typeof post.author === 'string' ? post.author : post.author.name
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: post.featuredImage ? [post.featuredImage] : ['https://toolscandy.com/logo.svg'],
    datePublished: post.date,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ToolsCandy',
      logo: {
        '@type': 'ImageObject',
        url: 'https://toolscandy.com/logo.svg',
        width: 200,
        height: 200,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://toolscandy.com/blog/${post.slug}`,
    },
    articleSection: post.category,
    keywords: post.tags?.join(', ') || '',
    inLanguage: 'en-US',
    isAccessibleForFree: 'True',
  }
}

/**
 * BreadcrumbList Schema (for navigation)
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * HowTo Schema (for tool pages with steps)
 */
export function generateHowToSchema(howToInfo: {
  name: string
  description: string
  totalTime?: string
  steps: Array<{ name: string; text: string; image?: string }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howToInfo.name,
    description: howToInfo.description,
    totalTime: howToInfo.totalTime || 'PT2M',
    step: howToInfo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
    })),
  }
}

/**
 * FAQPage Schema (for pages with FAQs)
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * BlogPosting Schema (alternative to Article for blogs)
 */
export function generateBlogPostingSchema(post: BlogPost) {
  const authorName = typeof post.author === 'string' ? post.author : post.author.name
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metaTitle || post.title,
    alternativeHeadline: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.featuredImage || 'https://toolscandy.com/logo.svg',
    datePublished: post.date,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ToolsCandy',
      logo: {
        '@type': 'ImageObject',
        url: 'https://toolscandy.com/logo.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://toolscandy.com/blog/${post.slug}`,
    },
    articleSection: post.category,
    keywords: post.tags?.join(', '),
    wordCount: Math.ceil(post.content.replace(/<[^>]*>/g, '').split(/\s+/).length),
  }
}

/**
 * Helper to render JSON-LD script tag
 */
export function renderJsonLd(data: any) {
  return {
    __html: JSON.stringify(data, null, 0),
  }
}

