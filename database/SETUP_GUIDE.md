# Database Setup Guide

This guide will help you set up the complete database schema for the My Scraper application.

## Prerequisites

1. Access to your Supabase project dashboard
2. SQL Editor permissions in Supabase

## Step-by-Step Setup

### 1. Run Initial Schema

In your Supabase SQL Editor, run the following files in order:

```sql
-- 1. First, run the initial schema
```

Copy and paste the content from `database/01_initial_schema.sql` into the SQL Editor and execute.

### 2. Run Website Management Schema

```sql
-- 2. Run website management extensions  
```

Copy and paste the content from `database/02_website_management.sql` into the SQL Editor and execute.

### 3. Run Real-time Monitoring Schema

```sql
-- 3. Run real-time monitoring and notification tables
```

Copy and paste the content from `database/03_realtime_monitoring_tables.sql` into the SQL Editor and execute.

## Verification

After running all scripts, verify your setup by running this query:

```sql
-- Verify all tables exist
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename LIKE 'scraper_%' 
ORDER BY tablename;
```

You should see the following tables:

- `scraper_ai_sessions`
- `scraper_job_executions`
- `scraper_job_progress`
- `scraper_jobs`
- `scraper_notification_history`
- `scraper_notification_settings`
- `scraper_notifications`
- `scraper_price_history`
- `scraper_products`
- `scraper_results`
- `scraper_websites`

## Enable Real-time Features

The real-time monitoring features require these tables to be enabled for real-time updates. The scripts automatically configure this, but you can verify by checking the Supabase Dashboard > Database > Replication.

## Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Row Level Security (RLS)

All tables have Row Level Security enabled to ensure users can only access their own data. The policies are automatically created by the scripts.

## Data Cleanup

The scripts include automatic cleanup functions for:
- Old job executions (keeps last 1000 per user)
- Old progress records (keeps only latest per execution)  
- Old notification history (keeps last 6 months)

You can run these manually if needed:

```sql
SELECT cleanup_old_job_executions();
SELECT cleanup_old_progress_records();
SELECT cleanup_old_notifications();
```

## Troubleshooting

### Common Issues

1. **Tables already exist**: If you see "table already exists" errors, this is normal - the scripts use `IF NOT EXISTS` clauses.

2. **Permission errors**: Make sure you're running the scripts as a database owner or with sufficient privileges.

3. **Real-time not working**: Check that the tables are enabled for real-time in your Supabase dashboard under Database > Replication.

4. **RLS blocking queries**: If you're having issues with data access, verify the RLS policies are correctly set up.

### Support

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify your environment variables are correct
3. Ensure you have the latest version of the database scripts