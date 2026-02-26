# How to Add Real Social Media Posts

## Quick Start

1. **Find Trending Posts** on each platform
2. **Copy the URL** of the post
3. **Update the URLs** in `src/socialMediaService.js`

## Where to Find Trending Content

### Twitter/X
1. Go to https://twitter.com/explore
2. Find trending posts you want to feature
3. Click on a tweet and copy the URL from your browser
   - Example: `https://twitter.com/NASA/status/1745123456789012345`

### Instagram  
1. Go to Instagram and find popular posts
2. Click "..." → "Copy link"
   - Example: `https://www.instagram.com/p/C12345AbCdE/`

### TikTok
1. Go to TikTok and find viral videos
2. Click "Share" → "Copy link"
   - Example: `https://www.tiktok.com/@user/video/1234567890123456789`

## Update the Code

Edit `src/socialMediaService.js`:

```javascript
export const trendingPostUrls = {
  twitter: [
    'PASTE_REAL_TWEET_URL_HERE',
    'PASTE_ANOTHER_TWEET_URL_HERE',
    // Add more tweets...
  ],
  instagram: [
    'PASTE_INSTAGRAM_POST_URL_HERE',
    'PASTE_ANOTHER_INSTAGRAM_POST_URL_HERE',
  ],
  tiktok: [
    'PASTE_TIKTOK_VIDEO_URL_HERE',
    'PASTE_ANOTHER_TIKTOK_VIDEO_URL_HERE',
  ]
}
```

## How It Works

- **On page load**: Fetches 6 random posts from your curated URLs
- **Every 10 minutes**: Automatically rotates to show different posts
- **If API fails**: Falls back to curated content with images
- **Real embeds**: Shows actual tweets, Instagram posts, and TikTok videos

## Important Notes

⚠️ **The URLs in the code are placeholders** - they won't work until you replace them with real post URLs

✅ **APIs Used:**
- Twitter oEmbed (no auth required)
- Instagram Graph API oEmbed (public posts only)
- TikTok oEmbed (public videos only)

🔄 **Update Regularly:** Change the URLs weekly to keep content fresh and viral

## Testing

After adding real URLs:
1. Save the file
2. Refresh the page
3. You should see real embedded social media posts!
4. If a post fails to load, it will use fallback content

## Troubleshooting

**Posts not loading?**
- Make sure URLs are for PUBLIC posts (not private accounts)
- Check browser console for errors
- Instagram may have stricter embed limits

**Want more variety?**
- Add more URLs to each array
- The system randomly selects 6 posts from your collection
