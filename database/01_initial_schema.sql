-- =====================================================
-- My Scraper Database Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. SCRAPING JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
    scraping_type VARCHAR(50) DEFAULT 'general' CHECK (scraping_type IN ('general', 'product', 'price', 'content')),
    
    -- AI Configuration
    ai_prompt TEXT,
    use_vision BOOLEAN DEFAULT false,
    gemini_model VARCHAR(100) DEFAULT 'gemini-pro',
    
    -- Scheduling
    schedule_enabled BOOLEAN DEFAULT false,
    schedule_cron VARCHAR(100), -- e.g., "0 9 * * *" for daily at 9am
    next_run_at TIMESTAMPTZ,
    
    -- Configuration
    config JSONB DEFAULT '{}', -- Custom scraping configuration
    selectors JSONB DEFAULT '{}', -- CSS selectors for specific elements
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    
    -- Indexing
    CONSTRAINT unique_user_job_name UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs" ON scraper_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON scraper_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON scraper_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON scraper_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. SCRAPING RESULTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES scraper_jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Results
    data JSONB NOT NULL DEFAULT '{}',
    raw_html TEXT,
    screenshot_url TEXT, -- For vision-based scraping
    
    -- Metadata
    status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
    error_message TEXT,
    execution_time_ms INTEGER,
    tokens_used INTEGER, -- For AI usage tracking
    
    -- Timestamps
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scraper_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own results" ON scraper_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own results" ON scraper_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. PRODUCT MONITORING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES scraper_jobs(id) ON DELETE CASCADE,
    
    -- Product Info
    name VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    image_url TEXT,
    
    -- Pricing
    current_price DECIMAL(10,2),
    target_price DECIMAL(10,2), -- Alert when price drops below this
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Availability
    in_stock BOOLEAN,
    last_stock_status BOOLEAN,
    
    -- Monitoring Config
    check_frequency_hours INTEGER DEFAULT 24,
    notifications_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ,
    
    CONSTRAINT unique_user_product_url UNIQUE(user_id, url)
);

-- Enable RLS
ALTER TABLE scraper_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own products" ON scraper_products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON scraper_products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON scraper_products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON scraper_products
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. PRICE HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES scraper_products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Price Data
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    in_stock BOOLEAN NOT NULL,
    
    -- Source
    scraped_from TEXT,
    
    -- Timestamp
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scraper_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own price history" ON scraper_price_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own price history" ON scraper_price_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES scraper_products(id) ON DELETE CASCADE,
    job_id UUID REFERENCES scraper_jobs(id) ON DELETE CASCADE,
    
    -- Notification Details
    type VARCHAR(50) NOT NULL CHECK (type IN ('price_drop', 'back_in_stock', 'job_completed', 'job_failed')),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    read BOOLEAN DEFAULT false,
    sent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE scraper_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON scraper_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON scraper_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_user_id ON scraper_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_next_run ON scraper_jobs(next_run_at) WHERE schedule_enabled = true;

-- Results indexes
CREATE INDEX IF NOT EXISTS idx_scraper_results_job_id ON scraper_results(job_id);
CREATE INDEX IF NOT EXISTS idx_scraper_results_user_id ON scraper_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_results_scraped_at ON scraper_results(scraped_at);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_scraper_products_user_id ON scraper_products(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_products_last_checked ON scraper_products(last_checked_at);

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_scraper_price_history_product_id ON scraper_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_scraper_price_history_recorded_at ON scraper_price_history(recorded_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_scraper_notifications_user_id ON scraper_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_notifications_unread ON scraper_notifications(user_id, read) WHERE read = false;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_scraper_jobs_updated_at BEFORE UPDATE ON scraper_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraper_products_updated_at BEFORE UPDATE ON scraper_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Verify tables were created
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename LIKE 'scraper_%'
ORDER BY tablename;