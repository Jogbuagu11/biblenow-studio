# JAAS Branding Setup Guide

## Why Your Branding Isn't Showing

Your Jitsi JAAS branding (logo, colors, custom URL) is not showing because:

1. **Missing JAAS Credentials**: You're using placeholder values instead of your actual JAAS App ID and JWT Secret
2. **No Environment Variables**: The app is using default values from `src/config/firebase.ts`
3. **Incomplete Configuration**: The Jitsi components weren't using the full branding configuration

## What I've Fixed

✅ **Updated `LiveStream.tsx`**: Added complete JAAS branding configuration
✅ **Updated `LiveStreamFullScreen.tsx`**: Added complete JAAS branding configuration  
✅ **Added Branding Options**: Logo, colors, custom URL, header/footer text
✅ **Removed Default Branding**: Hidden Jitsi watermarks and "Powered by" text

## Required Setup

### 1. Create Environment File

Create a `.env` file in your project root with your actual JAAS credentials:

```bash
# JAAS Configuration - REQUIRED FOR BRANDING
REACT_APP_JAAS_DOMAIN=8x8.vc
REACT_APP_JAAS_APP_ID=your-actual-jaas-app-id
REACT_APP_JAAS_JWT_SECRET=your-actual-jwt-secret

# Custom Branding URLs (Optional)
REACT_APP_CUSTOM_DOMAIN=https://your-custom-domain.com
REACT_APP_LOGO_URL=https://your-custom-domain.com/logo.png
```

### 2. Get Your JAAS Credentials

1. Go to [https://jaas.8x8.vc](https://jaas.8x8.vc)
2. Sign up or log in to your account
3. Create a new app or use an existing one
4. Copy your **App ID** and **JWT Secret**
5. Update your `.env` file with these values

### 3. Customize Your Branding

In both `LiveStream.tsx` and `LiveStreamFullScreen.tsx`, update these values:

```javascript
// Logo configuration
logoClickUrl: "https://your-actual-domain.com", // Your custom URL
logoImageUrl: "https://your-actual-domain.com/logo.png", // Your logo URL

// Custom colors (currently set to indigo theme)
colorPrimary: "#4F46E5", // Change to your brand color
colorSecondary: "#1E40AF", // Change to your secondary color

// Header and footer text
HEADER_TITLE: "Your Brand Name",
FOOTER_TEXT: "Powered by Your Brand Name",
```

### 4. Restart Your Application

After updating the `.env` file:

```bash
npm start
```

## Branding Features Now Available

✅ **Custom Logo**: Your logo will appear in the Jitsi interface
✅ **Custom Colors**: Your brand colors throughout the interface
✅ **Custom URL**: Clicking your logo goes to your website
✅ **Custom Header**: "BibleNOW Studio" in the header
✅ **Custom Footer**: "Powered by BibleNOW Studio" in the footer
✅ **No Jitsi Branding**: Removed default Jitsi watermarks
✅ **Branded Room Names**: Custom room alias

## Troubleshooting

### Branding Still Not Showing?

1. **Check Console**: Look for JAAS authentication errors
2. **Verify Credentials**: Ensure your App ID and JWT are correct
3. **Check Network**: Make sure your logo URL is accessible
4. **Clear Cache**: Hard refresh your browser (Ctrl+F5)

### Common Issues

- **"Invalid JWT"**: Your JWT secret is incorrect
- **"App not found"**: Your App ID is incorrect
- **Logo not loading**: Check your logo URL is accessible
- **Colors not applying**: Ensure color values are valid hex codes

## Next Steps

1. Get your actual JAAS credentials
2. Create the `.env` file with your credentials
3. Customize the branding colors and URLs
4. Test the live stream functionality
5. Verify your branding appears correctly

Your branding should now appear in both the regular live stream view and the full-screen view! 