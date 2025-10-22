# Database Setup Guide

## 📋 Phase 2: Database Setup

### Step 1: Run the SQL Schema

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/eloldmdciulxzwsnlvci
2. **Navigate to**: SQL Editor
3. **Copy and paste** the contents of `database/01_initial_schema.sql`
4. **Run the query** to create all tables

### Step 2: Verify Setup

After running the SQL, you should see these tables created:
- `scraper_jobs` - Stores scraping job configurations
- `scraper_results` - Stores scraping results and data
- `scraper_products` - Product monitoring setup
- `scraper_price_history` - Price tracking over time  
- `scraper_notifications` - User notifications

### Step 3: Row Level Security (RLS)

✅ **Already configured!** Each table has RLS policies that ensure:
- Users can only see/modify their own data
- All data is automatically scoped to the authenticated user
- No cross-user data leakage

### Step 4: Test the Setup

Once the database is set up, we can:
1. Create the first scraping job UI
2. Implement AI-powered scraping with Gemini
3. Set up product monitoring
4. Build the dashboard

## 🗂️ Database Structure

### Core Tables:
```
scraper_jobs (scraping configurations)
├── scraper_results (scraping outputs)
└── scraper_products (product monitoring)
    └── scraper_price_history (price tracking)

scraper_notifications (user alerts)
```

### Key Features:
- **User-scoped**: All data tied to authenticated user
- **Prefixed tables**: Works in shared database environment  
- **AI-ready**: Built for Gemini integration
- **Scheduled jobs**: Cron-based automation support
- **Price monitoring**: Full product tracking pipeline

Ready to proceed once you've run the SQL schema! 🚀