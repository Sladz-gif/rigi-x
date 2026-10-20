# Deployment Guide

## Vercel Deployment

This project is ready for deployment on Vercel. Follow these steps:

### 1. Connect to Vercel

Option A: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from GitHub (Sladz-gif/rigi-x)
4. Vercel will automatically detect Next.js settings

Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

### 2. Environment Variables

Add these environment variables in Vercel Dashboard (Settings > Environment Variables):

**Required:**
- `NEXT_PUBLIC_SITE_URL` - Your production domain (e.g., https://rigi-x.com)

**Optional:**
- `NEXT_PUBLIC_GA_ID` - Google Analytics ID
- `NEXT_PUBLIC_INSTAGRAM_URL` - Instagram profile URL
- `NEXT_PUBLIC_FACEBOOK_URL` - Facebook page URL
- `NEXT_PUBLIC_X_URL` - X (Twitter) profile URL
- `NEXT_PUBLIC_TIKTOK_URL` - TikTok profile URL

### 3. Build Settings

Vercel will automatically use the following settings from `package.json`:
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 4. Domain Configuration

After deployment:
1. Go to Project Settings > Domains
2. Add your custom domain (e.g., rigi-x.com)
3. Follow Vercel's DNS configuration instructions

### 5. Verify Deployment

Check the following after deployment:
- [ ] Homepage loads correctly
- [ ] Navigation works on all pages
- [ ] Car pages display correctly
- [ ] Service pages load
- [ ] Contact form renders
- [ ] Images load from Unsplash
- [ ] WhatsApp button functions
- [ ] Responsive design on mobile

## Project-Specific Notes

- This is a Next.js 16 project with Turbopack
- Uses static generation for optimal performance
- Images are served from Unsplash (remote patterns configured)
- No database required (data is in `/data` directory)
- No authentication required

## Troubleshooting

### Build Errors
- Ensure Node.js version is 18+ (Vercel defaults to 18.x)
- Check that all dependencies are in `package.json`

### Image Loading Issues
- Verify `next.config.ts` has Unsplash in `remotePatterns`
- Check Vercel's build logs for image optimization errors

### Route Issues
- Ensure all routes in `app/` directory are valid
- Check that dynamic routes (`[slug]`) have proper data files
