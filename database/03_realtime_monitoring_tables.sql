-- =====================================================
-- Real-time Monitoring & Notifications Database Schema
-- Run this in your Supabase SQL Editor after 01_initial_schema.sql
-- =====================================================

-- =====================================================
-- 1. JOB EXECUTIONS TABLE (for real-time monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_job_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES scraper_jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Execution Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration INTEGER, -- duration in seconds
    
    -- Results & Progress
    items_scraped INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_step TEXT,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(100),
    retry_count INTEGER DEFAULT 0,
    
    -- AI & Results
    ai_insights JSONB DEFAULT '{}',
    results_preview TEXT[], -- Array of preview strings
    screenshot_urls TEXT[], -- Array of screenshot URLs
    
    -- Performance Metrics
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    network_requests_count INTEGER DEFAULT 0,
    data_transferred_mb DECIMAL(10,2),
    
    -- Metadata
    execution_environment JSONB DEFAULT '{}', -- Browser info, IP, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for job executions
ALTER TABLE scraper_job_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job executions
CREATE POLICY "Users can view their own job executions" ON scraper_job_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job executions" ON scraper_job_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job executions" ON scraper_job_executions
    FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for job executions
CREATE INDEX IF NOT EXISTS idx_scraper_job_executions_job_id ON scraper_job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_scraper_job_executions_user_id ON scraper_job_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_job_executions_status ON scraper_job_executions(status);
CREATE INDEX IF NOT EXISTS idx_scraper_job_executions_started_at ON scraper_job_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_scraper_job_executions_active ON scraper_job_executions(job_id, status) WHERE status IN ('pending', 'running');

-- =====================================================
-- 2. JOB PROGRESS TABLE (for live progress updates)
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_job_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES scraper_jobs(id) ON DELETE CASCADE NOT NULL,
    execution_id UUID REFERENCES scraper_job_executions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Progress Information
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_step TEXT NOT NULL,
    items_processed INTEGER DEFAULT 0,
    total_items INTEGER,
    
    -- Performance Metrics
    items_per_second DECIMAL(10,2),
    estimated_completion TIMESTAMPTZ,
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    
    -- Status & Messages
    status_message TEXT,
    last_activity TEXT, -- Description of last activity
    
    -- Timestamps
    last_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for job progress
ALTER TABLE scraper_job_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job progress
CREATE POLICY "Users can view their own job progress" ON scraper_job_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job progress" ON scraper_job_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job progress" ON scraper_job_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for job progress
CREATE INDEX IF NOT EXISTS idx_scraper_job_progress_job_id ON scraper_job_progress(job_id);
CREATE INDEX IF NOT EXISTS idx_scraper_job_progress_execution_id ON scraper_job_progress(execution_id);
CREATE INDEX IF NOT EXISTS idx_scraper_job_progress_user_id ON scraper_job_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_job_progress_last_update ON scraper_job_progress(last_update);

-- Ensure only one progress record per execution (latest wins)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraper_job_progress_unique_execution ON scraper_job_progress(execution_id);

-- =====================================================
-- 3. NOTIFICATION SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Channel Configuration
    email_enabled BOOLEAN DEFAULT true,
    email_address TEXT,
    sms_enabled BOOLEAN DEFAULT false,
    sms_number TEXT,
    webhook_enabled BOOLEAN DEFAULT false,
    webhook_url TEXT,
    webhook_secret TEXT,
    
    -- Notification Types
    job_completion_enabled BOOLEAN DEFAULT true,
    job_failure_enabled BOOLEAN DEFAULT true,
    job_scheduled_enabled BOOLEAN DEFAULT false,
    price_alert_enabled BOOLEAN DEFAULT true,
    stock_alert_enabled BOOLEAN DEFAULT true,
    error_threshold_enabled BOOLEAN DEFAULT true,
    
    -- Frequency & Timing
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME, -- e.g., '22:00'
    quiet_hours_end TIME,   -- e.g., '08:00'
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Rate Limiting
    max_notifications_per_hour INTEGER DEFAULT 10,
    max_notifications_per_day INTEGER DEFAULT 50,
    batch_notifications BOOLEAN DEFAULT false,
    batch_delay_minutes INTEGER DEFAULT 15,
    
    -- Filters
    min_execution_time_seconds INTEGER DEFAULT 30, -- Only notify for jobs longer than X seconds
    only_important_failures BOOLEAN DEFAULT false,
    failure_threshold_count INTEGER DEFAULT 3, -- Notify after X consecutive failures
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one settings record per user
    CONSTRAINT unique_user_notification_settings UNIQUE(user_id)
);

-- Enable RLS for notification settings
ALTER TABLE scraper_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification settings
CREATE POLICY "Users can view their own notification settings" ON scraper_notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON scraper_notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON scraper_notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Index for notification settings
CREATE INDEX IF NOT EXISTS idx_scraper_notification_settings_user_id ON scraper_notification_settings(user_id);

-- =====================================================
-- 4. NOTIFICATION HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES scraper_jobs(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES scraper_job_executions(id) ON DELETE SET NULL,
    product_id UUID REFERENCES scraper_products(id) ON DELETE SET NULL,
    
    -- Notification Details
    notification_type VARCHAR(100) NOT NULL CHECK (notification_type IN (
        'job_completion', 'job_failure', 'job_scheduled', 'price_alert', 
        'stock_alert', 'error_threshold', 'system_alert'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Channel Information
    channels_sent TEXT[] DEFAULT '{}', -- ['email', 'sms', 'webhook']
    channel_statuses JSONB DEFAULT '{}', -- {'email': 'sent', 'sms': 'failed', 'webhook': 'pending'}
    
    -- Delivery Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(100),
    
    -- Metadata
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    read_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}', -- Additional context data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification history
ALTER TABLE scraper_notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification history
CREATE POLICY "Users can view their own notification history" ON scraper_notification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification history" ON scraper_notification_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification history" ON scraper_notification_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for notification history
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_user_id ON scraper_notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_job_id ON scraper_notification_history(job_id);
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_execution_id ON scraper_notification_history(execution_id);
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_type ON scraper_notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_status ON scraper_notification_history(status);
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_created_at ON scraper_notification_history(created_at);
CREATE INDEX IF NOT EXISTS idx_scraper_notification_history_unread ON scraper_notification_history(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Add triggers for updated_at columns
CREATE TRIGGER update_scraper_job_executions_updated_at BEFORE UPDATE ON scraper_job_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraper_notification_settings_updated_at BEFORE UPDATE ON scraper_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraper_notification_history_updated_at BEFORE UPDATE ON scraper_notification_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. FUNCTIONS FOR AUTOMATIC CLEANUP
-- =====================================================

-- Function to clean up old job executions (optional - keep last 1000 per user)
CREATE OR REPLACE FUNCTION cleanup_old_job_executions()
RETURNS void AS $$
BEGIN
    DELETE FROM scraper_job_executions 
    WHERE id NOT IN (
        SELECT id FROM scraper_job_executions 
        ORDER BY started_at DESC 
        LIMIT 1000
    ) 
    AND started_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old progress records (keep only latest per execution)
CREATE OR REPLACE FUNCTION cleanup_old_progress_records()
RETURNS void AS $$
BEGIN
    DELETE FROM scraper_job_progress 
    WHERE id NOT IN (
        SELECT DISTINCT ON (execution_id) id 
        FROM scraper_job_progress 
        ORDER BY execution_id, last_update DESC
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notification history (keep last 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM scraper_notification_history 
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. REALTIME PUBLICATION (for Supabase real-time)
-- =====================================================

-- Enable real-time for tables
ALTER publication supabase_realtime ADD TABLE scraper_job_executions;
ALTER publication supabase_realtime ADD TABLE scraper_job_progress;
ALTER publication supabase_realtime ADD TABLE scraper_notification_history;

-- =====================================================
-- 8. DEFAULT NOTIFICATION SETTINGS FUNCTION
-- =====================================================

-- Function to create default notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS trigger AS $$
BEGIN
    INSERT INTO scraper_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();
    END IF;
END $$;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Verify new tables were created
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename IN (
    'scraper_job_executions', 
    'scraper_job_progress', 
    'scraper_notification_settings', 
    'scraper_notification_history'
)
ORDER BY tablename;