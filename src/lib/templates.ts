import { type ScrapingJob } from '@/lib/supabase';

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  category: 'e-commerce' | 'news' | 'social' | 'business' | 'tech' | 'general';
  icon: string;
  example_url: string;
  scraping_type: 'general' | 'product' | 'price' | 'content';
  ai_prompt: string;
  use_vision: boolean;
  gemini_model: string;
  selectors?: Record<string, string>;
  config: Record<string, unknown>;
}

export const JOB_TEMPLATES: JobTemplate[] = [
  // E-commerce Templates
  {
    id: 'amazon-product',
    name: 'Amazon Product',
    description: 'Extract product details from Amazon product pages',
    category: 'e-commerce',
    icon: '🛒',
    example_url: 'https://www.amazon.com/dp/B08N5WRWNW',
    scraping_type: 'product',
    ai_prompt: `Extract detailed product information from this Amazon product page including:
- Product title and brand
- Price (current, original, discount percentage)
- Product description and key features
- Technical specifications
- Customer rating and review count
- Availability status
- Product images (URLs)
- Shipping information
- Product category and subcategory

Return the data in a structured JSON format with clear field names.`,
    use_vision: true,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'amazon-product', retry_count: 3 }
  },

  {
    id: 'shopify-store',
    name: 'Shopify Store Product',
    description: 'Extract product information from Shopify stores',
    category: 'e-commerce',
    icon: '🏪',
    example_url: 'https://example.myshopify.com/products/product-name',
    scraping_type: 'product',
    ai_prompt: `Extract product information from this Shopify product page:
- Product name and description
- Price and variants (size, color, etc.)
- Product images
- Stock availability
- Product reviews and ratings
- Shipping and return policy
- Related/recommended products

Format as structured JSON with clear categorization.`,
    use_vision: true,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'shopify-store' }
  },

  {
    id: 'price-comparison',
    name: 'Price Monitor',
    description: 'Monitor price changes across different retailers',
    category: 'e-commerce',
    icon: '💰',
    example_url: 'https://example.com/product/123',
    scraping_type: 'price',
    ai_prompt: `Extract pricing information from this product page:
- Current price
- Original/MSRP price
- Discount amount and percentage
- Currency
- Stock status
- Price change indicators
- Special offers or promotions
- Price comparison with competitors if shown

Return data focusing on price-related information in JSON format.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'price-monitor', schedule_enabled: true }
  },

  // News & Content Templates
  {
    id: 'news-article',
    name: 'News Article',
    description: 'Extract structured data from news articles',
    category: 'news',
    icon: '📰',
    example_url: 'https://example-news.com/article/title',
    scraping_type: 'content',
    ai_prompt: `Extract article information from this news page:
- Article headline and subheadline
- Author name and publication date
- Article body text (full content)
- Article summary/excerpt
- Tags and categories
- Related articles
- Comments count
- Social media share counts
- Image URLs and captions

Structure the content in clean JSON format suitable for content management.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'news-article' }
  },

  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Extract blog post content and metadata',
    category: 'news',
    icon: '📝',
    example_url: 'https://example-blog.com/2024/post-title',
    scraping_type: 'content',
    ai_prompt: `Extract blog post information:
- Post title and subtitle
- Author information (name, bio, social links)
- Publication and last updated dates
- Full post content with formatting preserved
- Tags and categories
- Comments and engagement metrics
- Related posts
- SEO metadata (meta description, keywords)

Return structured data maintaining content hierarchy.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'blog-post' }
  },

  // Business Templates
  {
    id: 'company-directory',
    name: 'Company Directory',
    description: 'Extract business information from directory listings',
    category: 'business',
    icon: '🏢',
    example_url: 'https://business-directory.com/company/example-inc',
    scraping_type: 'general',
    ai_prompt: `Extract company information from this business directory page:
- Company name and legal name
- Business address and contact information
- Phone numbers and email addresses
- Website and social media links
- Business description and services
- Industry and business category
- Number of employees
- Founded date
- Reviews and ratings
- Key personnel and leadership

Format as comprehensive business profile in JSON.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'company-directory' }
  },

  {
    id: 'job-listing',
    name: 'Job Listing',
    description: 'Extract job posting details from career sites',
    category: 'business',
    icon: '💼',
    example_url: 'https://careers.example.com/jobs/123',
    scraping_type: 'general',
    ai_prompt: `Extract job listing information:
- Job title and level (junior, senior, etc.)
- Company name and description
- Job location (remote, hybrid, on-site)
- Salary range and benefits
- Job requirements and qualifications
- Responsibilities and duties
- Application deadline
- Employment type (full-time, part-time, contract)
- Required skills and technologies
- Application process and contact information

Structure as detailed job posting data in JSON.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'job-listing' }
  },

  // Tech Templates
  {
    id: 'github-repo',
    name: 'GitHub Repository',
    description: 'Extract repository information from GitHub',
    category: 'tech',
    icon: '💻',
    example_url: 'https://github.com/username/repository',
    scraping_type: 'general',
    ai_prompt: `Extract GitHub repository information:
- Repository name and description
- Owner/organization information
- Programming languages used
- Stars, forks, and watchers count
- License information
- README content summary
- Latest releases and tags
- Contributor information
- Issues and pull requests stats
- Last updated date

Return comprehensive repository metadata in JSON format.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'github-repo' }
  },

  {
    id: 'api-documentation',
    name: 'API Documentation',
    description: 'Extract API endpoints and documentation',
    category: 'tech',
    icon: '🔌',
    example_url: 'https://api-docs.example.com/v1/reference',
    scraping_type: 'content',
    ai_prompt: `Extract API documentation information:
- API name and version
- Available endpoints and methods
- Request/response parameters
- Authentication requirements
- Rate limiting information
- Code examples in different languages
- Error codes and responses
- SDKs and client libraries
- Getting started guide

Structure as comprehensive API reference in JSON.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'api-docs' }
  },

  // Social Media Templates
  {
    id: 'social-profile',
    name: 'Social Media Profile',
    description: 'Extract public profile information from social platforms',
    category: 'social',
    icon: '👤',
    example_url: 'https://social-platform.com/username',
    scraping_type: 'general',
    ai_prompt: `Extract public social media profile information:
- Profile name and username
- Bio/description
- Follower and following counts
- Profile picture and banner URLs
- Location and website links
- Verification status
- Public post counts
- Join date
- Contact information (if public)

Only extract publicly visible information. Structure as profile summary in JSON.`,
    use_vision: true,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'social-profile', respectful_scraping: true }
  },

  // General Templates
  {
    id: 'contact-page',
    name: 'Contact Information',
    description: 'Extract contact details from business websites',
    category: 'general',
    icon: '📞',
    example_url: 'https://example.com/contact',
    scraping_type: 'general',
    ai_prompt: `Extract contact information from this page:
- Business name and address
- Phone numbers (main, support, sales)
- Email addresses by department
- Office hours and time zones
- Physical location and directions
- Contact forms and submission methods
- Social media links
- Support channels (chat, tickets, etc.)
- Emergency contact information

Format as comprehensive contact directory in JSON.`,
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash',
    config: { template: 'contact-info' }
  }
];

// Helper functions for templates
export function getTemplateById(id: string): JobTemplate | undefined {
  return JOB_TEMPLATES.find(template => template.id === id);
}

export function getTemplatesByCategory(category: JobTemplate['category']): JobTemplate[] {
  return JOB_TEMPLATES.filter(template => template.category === category);
}

export function createJobFromTemplate(template: JobTemplate, customization: {
  name?: string;
  url?: string;
  ai_prompt?: string;
}): Partial<ScrapingJob> {
  return {
    name: customization.name || `${template.name} - ${new Date().toLocaleDateString()}`,
    url: customization.url || template.example_url,
    scraping_type: template.scraping_type,
    ai_prompt: customization.ai_prompt || template.ai_prompt,
    use_vision: template.use_vision,
    gemini_model: template.gemini_model,
    status: 'pending',
    config: { ...template.config, template_id: template.id },
    selectors: template.selectors || {},
    schedule_enabled: false,
  };
}

export const TEMPLATE_CATEGORIES: Array<{
  id: JobTemplate['category'];
  name: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'e-commerce',
    name: 'E-commerce',
    description: 'Product pages, pricing, online stores',
    icon: '🛒'
  },
  {
    id: 'news',
    name: 'News & Content',
    description: 'Articles, blogs, content sites',
    icon: '📰'
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Company info, directories, job listings',
    icon: '🏢'
  },
  {
    id: 'tech',
    name: 'Technology',
    description: 'GitHub, APIs, documentation',
    icon: '💻'
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'Profiles, public content',
    icon: '👥'
  },
  {
    id: 'general',
    name: 'General',
    description: 'Contact info, miscellaneous',
    icon: '🔍'
  }
];