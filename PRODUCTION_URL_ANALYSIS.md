# 🌐 Production URL Configuration Analysis

## Current CORS Settings Analysis

### ❗ Security Issue Found: Overly Permissive CORS
Both Edge Functions currently have:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ⚠️ TOO PERMISSIVE FOR PRODUCTION
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## 🔒 Production-Ready CORS Configuration Needed

### Recommended Changes:

1. **job-scheduler/index.ts**:
   - Replace `'*'` with specific production domain
   - Add environment-based domain configuration

2. **send-notification/index.ts**:
   - Replace `'*'` with specific production domain
   - Add environment-based domain configuration

### Expected Production Domains:
- **Local Development**: `http://localhost:5173`
- **Staging**: `https://staging-my-scraper.netlify.app` (if exists)
- **Production**: `https://my-scraper.netlify.app` (or custom domain)

## 🛠️ Required Updates

### Environment Variables Needed:
```bash
# Add to Supabase Edge Function secrets
ALLOWED_ORIGINS=https://my-scraper.netlify.app,https://staging-my-scraper.netlify.app
# or
PRODUCTION_DOMAIN=https://my-scraper.netlify.app
NODE_ENV=production
```

### Updated CORS Headers:
```typescript
const getAllowedOrigins = () => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173',  // Development
    'https://my-scraper.netlify.app'  // Production
  ];
  return allowedOrigins;
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};
```

## 📋 Deployment Checklist for Production URLs

### ✅ Current Status:
- [x] Edge Functions deployed to Supabase
- [x] Environment variables configured
- [x] Database tables created
- [x] Frontend environment variables set

### ❌ Issues to Fix:
- [ ] CORS headers too permissive (`*`)
- [ ] No origin validation in Edge Functions
- [ ] Missing production domain configuration
- [ ] No environment-specific CORS settings

### 🔧 Action Items:
1. Update CORS headers in both Edge Functions
2. Add ALLOWED_ORIGINS environment variable
3. Test with actual production domain
4. Verify webhook URLs work with production domain
5. Test authentication with production URLs

## 🚨 Security Recommendations

### Immediate Actions:
1. **Update CORS headers** to be domain-specific
2. **Add origin validation** in Edge Functions
3. **Set production domain** in environment variables
4. **Test cross-origin requests** with actual domains

### Best Practices:
- Never use `'*'` for CORS in production
- Always validate request origins
- Use environment variables for domain configuration
- Implement proper error handling for invalid origins
- Log suspicious cross-origin requests

## 🧪 Testing Production URLs

### Test Cases:
1. Frontend on production domain calling Edge Functions
2. Webhook notifications to external services
3. CORS preflight requests from production domain
4. Authentication flow with production URLs
5. Real-time subscriptions with production domain

### Verification Commands:
```bash
# Test CORS from production domain
curl -H "Origin: https://my-scraper.netlify.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: authorization,content-type" \
     -X OPTIONS \
     https://eloldmdciulxzwsnlvci.supabase.co/functions/v1/job-scheduler

# Test actual function call
curl -X POST \
     -H "Origin: https://my-scraper.netlify.app" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"jobId":"test","scheduleConfig":{"frequency":"manual"}}' \
     https://eloldmdciulxzwsnlvci.supabase.co/functions/v1/job-scheduler
```

## 📊 Current Environment Analysis

Based on the `.env` file, the frontend is configured for:
- **Supabase URL**: `https://eloldmdciulxzwsnlvci.supabase.co`
- **Frontend Domain**: Likely `localhost:5173` (development)
- **Production Domain**: Not yet determined (needs deployment)

The Edge Functions will need to allow requests from the actual production domain where the frontend is deployed.