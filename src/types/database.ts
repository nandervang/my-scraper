export interface ScraperProduct {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  model?: string;
  keywords?: string[];
  category?: string;
  image_url?: string;
  target_price?: number;
  created_at: string;
  updated_at: string;
}

export interface ScraperWebsite {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  scraping_rules?: ScrapingRules;
  is_active: boolean;
  last_scraped_at?: string;
  created_at: string;
}

export interface ScraperPriceHistory {
  id: string;
  product_id: string;
  website_id: string;
  price: number;
  currency: string;
  availability: boolean;
  product_url?: string;
  scraped_at: string;
}

export interface ScrapingRules {
  selectors?: {
    price?: string;
    title?: string;
    availability?: string;
    image?: string;
  };
  rate_limit_ms?: number;
  user_agent?: string;
  headers?: Record<string, string>;
}