-- =====================================================
-- Phase 3.1: Website Management & Source Discovery
-- Add this to your existing database schema
-- =====================================================

-- =====================================================
-- WEBSITES TABLE (Primary Sources)
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_websites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Website Info
    name VARCHAR(255) NOT NULL,
    base_url TEXT NOT NULL,
    category VARCHAR(100), -- e.g., 'electronics', 'fashion', 'books'
    
    -- Scraping Configuration
    scraping_rules JSONB DEFAULT '{}', -- CSS selectors, pagination rules, etc.
    rate_limit_seconds INTEGER DEFAULT 5,
    requires_auth BOOLEAN DEFAULT false,
    auth_config JSONB DEFAULT '{}', -- encrypted credentials if needed
    
    -- Status & Validation
    is_active BOOLEAN DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    validation_status VARCHAR(50) DEFAULT 'pending', -- 'valid', 'invalid', 'pending'
    robots_txt_compliant BOOLEAN DEFAULT true,
    
    -- AI Discovery
    discovered_by_ai BOOLEAN DEFAULT false,
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    similar_websites TEXT[], -- Array of similar website URLs
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_website_url UNIQUE(user_id, base_url)
);

-- Enable RLS
ALTER TABLE scraper_websites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own websites" ON scraper_websites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own websites" ON scraper_websites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own websites" ON scraper_websites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own websites" ON scraper_websites
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- AI SCRAPING SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_ai_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    website_id UUID REFERENCES scraper_websites(id) ON DELETE CASCADE,
    
    -- Session Info
    session_type VARCHAR(50) DEFAULT 'product_discovery', -- 'product_discovery', 'price_check', 'source_discovery'
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    
    -- AI Configuration
    gemini_model_used VARCHAR(100) DEFAULT 'gemini-pro',
    search_query TEXT,
    target_category VARCHAR(100),
    
    -- Results
    products_found INTEGER DEFAULT 0,
    prices_extracted INTEGER DEFAULT 0,
    sources_discovered INTEGER DEFAULT 0,
    ai_insights JSONB DEFAULT '{}',
    screenshot_urls TEXT[],
    
    -- Error Handling
    error_log TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Performance
    execution_time_ms INTEGER,
    tokens_used INTEGER
);

-- Enable RLS
ALTER TABLE scraper_ai_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI sessions" ON scraper_ai_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI sessions" ON scraper_ai_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- UPDATE EXISTING PRODUCTS TABLE
-- =====================================================
-- Add website relationships and discovery fields
ALTER TABLE scraper_products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255),
ADD COLUMN IF NOT EXISTS model VARCHAR(255),
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS primary_sources UUID[] DEFAULT '{}', -- Array of website IDs
ADD COLUMN IF NOT EXISTS discovered_sources JSONB DEFAULT '{}'; -- AI-discovered sources with confidence scores

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_scraper_websites_user_id ON scraper_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_websites_category ON scraper_websites(category);
CREATE INDEX IF NOT EXISTS idx_scraper_websites_active ON scraper_websites(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scraper_ai_sessions_user_id ON scraper_ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_ai_sessions_status ON scraper_ai_sessions(status);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_scraper_websites_updated_at BEFORE UPDATE ON scraper_websites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFY TABLES
-- =====================================================
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename LIKE 'scraper_%'
ORDER BY tablename;