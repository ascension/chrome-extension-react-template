# Testing Instructions for Chrome Extension Fix

## Overview
The Chrome extension service worker registration error (status code 15) has been fixed. Follow these steps to test the extension.

## Prerequisites
1. Ensure you have the correct environment variables in `.env` file
2. Build the extension using `npm run build`
3. Chrome browser with Developer mode enabled

## Testing Steps

### 1. Build the Extension
```bash
npm run build
```

### 2. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the `dist` folder from the project root
5. The extension should load without errors

### 3. Verify Service Worker
1. In the Extensions page, find "Hive 3D Harvest"
2. Click "service worker" link (should be blue, not red)
3. This opens the service worker console
4. You should see logs like:
   ```
   [Print Hive] Background script loading...
   [Print Hive] Environment variables: {...}
   [Print Hive] ServiceWorker: Starting initialization
   ```

### 4. Expected Behavior
✅ **Service worker loads successfully** (no status code 15 error)
✅ **Console shows initialization logs**
✅ **No DOM-related errors in service worker console**
✅ **Extension icon appears in toolbar**

### 5. Troubleshooting

#### If service worker still fails:
1. Check console for specific errors
2. Verify build output contains no DOM references:
   ```bash
   grep -c "window\|document" dist/assets/background.js
   # Should return 0
   ```

#### If environment variables are missing:
1. Update `.env` file with actual values:
   ```env
   VITE_SUPABASE_URL=https://your-actual-supabase-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   # ... other variables
   ```
2. Rebuild: `npm run build`
3. Reload extension in Chrome

## File Changes Made

### Fixed Files:
- `vite.content.config.ts` - Updated build configuration
- `.env` - Added environment variables
- `chrome-extension-service-worker-fix.md` - Documentation

### Build Output:
- `dist/assets/background.js` - Now service worker compatible
- No DOM dependencies
- Proper environment variable injection

## Success Indicators

1. **Extension loads without errors**
2. **Service worker status is "active"**
3. **Background script console shows initialization logs**
4. **No "Service worker registration failed" errors**

## Next Steps

After confirming the extension loads:
1. Update `.env` with actual Supabase credentials
2. Test extension functionality on target websites
3. Verify content scripts work properly
4. Test popup functionality

The core service worker registration issue is now resolved!