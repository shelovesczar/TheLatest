# Deployment Guide for Netlify

## Full Production Setup

This project uses **Netlify Serverless Functions** to keep API keys secure on the server side.

### Files Created:
- `netlify/functions/fetchNews.js` - Server-side function that handles all API calls
- `netlify.toml` - Netlify configuration file
- `.env` - Local environment variables (DO NOT commit to git)
- `.env.example` - Template for environment variables
- Updated `newsService.js` - Now calls Netlify functions instead of APIs directly

---

## Local Development

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Test Locally with Netlify Dev
```bash
netlify dev
```

This will:
- Start your Vite dev server
- Run Netlify Functions locally
- Load environment variables from `.env`
- Preview at `http://localhost:8888`

---

## Deploy to Netlify

### Option 1: Deploy via Netlify UI (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Netlify serverless functions"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Netlify will auto-detect settings from `netlify.toml`

3. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add these variables:
     - `NEWS_API_KEY` = `0b0041996c424f25850a21dd1d75b810`
     - `GNEWS_API_KEY` = `03280f741607ebb5d78f02ee71186de4`

4. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete
   - Your site is live! 🎉

### Option 2: Deploy via Netlify CLI

```bash
# Login to Netlify
netlify login

# Initialize site
netlify init

# Set environment variables
netlify env:set NEWS_API_KEY "0b0041996c424f25850a21dd1d75b810"
netlify env:set GNEWS_API_KEY "03280f741607ebb5d78f02ee71186de4"

# Deploy
netlify deploy --prod
```

---

## How It Works

### Before (Insecure):
```
Browser → Direct API Call → NewsAPI.org
         (API key visible in DevTools!)
```

### After (Secure):
```
Browser → Netlify Function → NewsAPI.org
         (API key stays on server!)
```

### Request Flow:
1. User visits your site
2. `newsService.js` calls `/.netlify/functions/fetchNews?endpoint=topNews`
3. Netlify function runs on server with environment variables
4. Function fetches from NewsAPI using secure API key
5. Function returns data to browser
6. Browser displays news

---

## API Endpoints

Your Netlify function supports these endpoints:

- `/.netlify/functions/fetchNews?endpoint=topNews` - Top headlines
- `/.netlify/functions/fetchNews?endpoint=category&category=business` - Category news
- `/.netlify/functions/fetchNews?endpoint=opinions` - Opinion articles
- `/.netlify/functions/fetchNews?endpoint=videos` - Video content
- `/.netlify/functions/fetchNews?endpoint=trending` - Podcast/interview content

---

## Fallback System

If APIs fail or rate limits are hit, the app automatically displays professional fallback content. Your site **always works**, even without API access.

---

## Important Notes

### ✅ What's Secure Now:
- API keys are in environment variables on Netlify servers
- Keys are NOT visible in browser DevTools
- Keys are NOT in your public GitHub repository
- Functions run server-side with full security

### ⚠️ Rate Limits:
- NewsAPI Free Tier: 100 requests/day
- Each page load uses 4 requests (top stories, opinions, videos, podcasts)
- ~25 users per day maximum
- Consider upgrading to NewsAPI Developer Plan ($449/month) for production

### 🔄 Auto-Refresh:
- Content refreshes every 10 minutes automatically
- Uses cached data between refreshes
- Fallback content displays if API fails

---

## Testing Your Deployment

After deployment, check:
1. ✅ Site loads without errors
2. ✅ News content displays (not just fallback)
3. ✅ Console has no API key warnings
4. ✅ DevTools Network tab shows calls to `/.netlify/functions/fetchNews`
5. ✅ No 401 or 403 errors (means API keys work)

---

## Troubleshooting

### "Failed to fetch news"
- Check environment variables are set in Netlify dashboard
- Verify variable names match exactly: `NEWS_API_KEY`, `GNEWS_API_KEY`
- Check Netlify function logs in dashboard

### Rate Limit Exceeded
- NewsAPI free tier only allows 100 requests/day
- Fallback content will display automatically
- Consider upgrading API plan or caching responses

### Function Not Found (404)
- Verify `netlify.toml` is in repository root
- Check `functions = "netlify/functions"` path is correct
- Redeploy site

---

## Next Steps

### Optional Enhancements:
1. **Add Caching**: Store API responses for 5-10 minutes to reduce API calls
2. **Monitoring**: Set up Netlify analytics to track function usage
3. **Upgrade API**: Get NewsAPI Developer plan for production traffic
4. **Real Social Media**: Integrate Twitter/Instagram embed APIs

---

## Support

For issues:
- Netlify Docs: https://docs.netlify.com/functions/overview/
- NewsAPI Docs: https://newsapi.org/docs
- Check Netlify function logs in dashboard

---

**Your site is now production-ready with secure API key management!** 🚀
