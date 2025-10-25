# 🔐 Google OAuth Configuration Guide

## Issue Identified
The Google OAuth callback is currently redirecting to `localhost:3000` instead of your production domain `https://mein-scraper.netlify.app`. This indicates that your Supabase project's Site URL is misconfigured.

## 🚀 Required Configuration Updates

### 1. Supabase Dashboard Settings

**Navigate to:** https://supabase.com/dashboard/project/eloldmdciulxzwsnlvci/auth/url-configuration

**Update these settings:**

#### Site URL
```
https://mein-scraper.netlify.app
```

#### Redirect URLs (Add both)
```
https://mein-scraper.netlify.app/auth/callback
http://localhost:5173/auth/callback
```

### 2. Google Cloud Console Configuration

**Navigate to:** [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

**Find your OAuth 2.0 Client ID and add these Authorized redirect URIs:**

```
https://eloldmdciulxzwsnlvci.supabase.co/auth/v1/callback
```

### 3. Verification Steps

After making the changes:

1. **Test Development:**
   - Run `npm run dev`
   - Try Google sign-in at `http://localhost:5173`
   - Should redirect to `http://localhost:5173/auth/callback`

2. **Test Production:**
   - Deploy to Netlify: `https://mein-scraper.netlify.app`
   - Try Google sign-in
   - Should redirect to `https://mein-scraper.netlify.app/auth/callback`

## 🔍 Current OAuth Flow

Your application uses this OAuth flow:

1. **User clicks "Continue with Google"**
2. **Redirects to Google OAuth** with these parameters:
   - `redirect_uri`: `https://eloldmdciulxzwsnlvci.supabase.co/auth/v1/callback`
   - `client_id`: Your Google OAuth Client ID

3. **Google redirects back to Supabase** with auth code
4. **Supabase processes the auth** and redirects to your Site URL + `/auth/callback`
5. **Your app handles the callback** in `AuthCallback.tsx`

## ⚠️ Common Issues

### Issue: Still redirecting to localhost:3000
**Solution:** Clear browser cache and ensure Supabase Site URL is updated

### Issue: Google OAuth error "redirect_uri_mismatch"
**Solution:** Ensure the Supabase callback URL is added to Google Cloud Console

### Issue: CORS errors in production
**Solution:** Verify that `mein-scraper.netlify.app` is in your `ALLOWED_ORIGINS` (✅ Already updated)

## 🛠️ Current Configuration Status

- ✅ **Edge Functions CORS**: Updated with `mein-scraper.netlify.app`
- ✅ **Environment Variables**: `ALLOWED_ORIGINS` configured correctly
- ❌ **Supabase Site URL**: Needs update to `https://mein-scraper.netlify.app`
- ❌ **Google OAuth Redirect URIs**: Need to include Supabase callback URL

## 📝 Next Steps

1. Update Supabase Dashboard settings (Site URL + Redirect URLs)
2. Update Google Cloud Console OAuth configuration
3. Test both development and production OAuth flows
4. Clear browser cache if issues persist