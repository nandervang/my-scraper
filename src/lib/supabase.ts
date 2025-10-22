import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// DATABASE TYPES
// =====================================================

export interface ScrapingJob {
  id: string;
  user_id: string;
  name: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  scraping_type: 'general' | 'product' | 'price' | 'content';
  
  // AI Configuration
  ai_prompt?: string;
  use_vision: boolean;
  gemini_model: string;
  
  // Scheduling
  schedule_enabled: boolean;
  schedule_cron?: string;
  next_run_at?: string;
  
  // Configuration
  config: Record<string, unknown>;
  selectors: Record<string, string>;
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_run_at?: string;
}

export interface ScrapingResult {
  id: string;
  job_id: string;
  user_id: string;
  
  // Results
  data: Record<string, unknown>;
  raw_html?: string;
  screenshot_url?: string;
  
  // Metadata
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  tokens_used?: number;
  
  // Timestamps
  scraped_at: string;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  job_id?: string;
  
  // Product Info
  name: string;
  url: string;
  image_url?: string;
  
  // Pricing
  current_price?: number;
  target_price?: number;
  currency: string;
  
  // Availability
  in_stock?: boolean;
  last_stock_status?: boolean;
  
  // Monitoring Config
  check_frequency_hours: number;
  notifications_enabled: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_checked_at?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  user_id: string;
  
  // Price Data
  price: number;
  currency: string;
  in_stock: boolean;
  
  // Source
  scraped_from?: string;
  
  // Timestamp
  recorded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  product_id?: string;
  job_id?: string;
  
  // Notification Details
  type: 'price_drop' | 'back_in_stock' | 'job_completed' | 'job_failed';
  title: string;
  message: string;
  
  // Status
  read: boolean;
  sent: boolean;
  
  // Timestamps
  created_at: string;
  read_at?: string;
}

// =====================================================
// DATABASE FUNCTIONS
// =====================================================

export const db = {
  // Jobs
  jobs: {
    list: () => supabase.from('scraper_jobs').select('*').order('created_at', { ascending: false }),
    get: (id: string) => supabase.from('scraper_jobs').select('*').eq('id', id).single(),
    create: (job: Partial<ScrapingJob>) => supabase.from('scraper_jobs').insert(job).select().single(),
    update: (id: string, updates: Partial<ScrapingJob>) => supabase.from('scraper_jobs').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('scraper_jobs').delete().eq('id', id),
  },
  
  // Results
  results: {
    list: (jobId?: string) => {
      let query = supabase.from('scraper_results').select('*').order('scraped_at', { ascending: false });
      if (jobId) query = query.eq('job_id', jobId);
      return query;
    },
    get: (id: string) => supabase.from('scraper_results').select('*').eq('id', id).single(),
    create: (result: Partial<ScrapingResult>) => supabase.from('scraper_results').insert(result).select().single(),
  },
  
  // Products
  products: {
    list: () => supabase.from('scraper_products').select('*').order('created_at', { ascending: false }),
    get: (id: string) => supabase.from('scraper_products').select('*').eq('id', id).single(),
    create: (product: Partial<Product>) => supabase.from('scraper_products').insert(product).select().single(),
    update: (id: string, updates: Partial<Product>) => supabase.from('scraper_products').update(updates).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('scraper_products').delete().eq('id', id),
  },
  
  // Price History
  priceHistory: {
    list: (productId: string) => supabase.from('scraper_price_history').select('*').eq('product_id', productId).order('recorded_at', { ascending: false }),
    create: (history: Partial<PriceHistory>) => supabase.from('scraper_price_history').insert(history).select().single(),
  },
  
  // Notifications
  notifications: {
    list: () => supabase.from('scraper_notifications').select('*').order('created_at', { ascending: false }),
    markAsRead: (id: string) => supabase.from('scraper_notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id),
    create: (notification: Partial<Notification>) => supabase.from('scraper_notifications').insert(notification).select().single(),
  }
};