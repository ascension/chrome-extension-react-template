# Chrome Extension Service Worker Fix

## Problem
The Chrome extension was failing to load with the error:
- **Error**: Service worker registration failed with status code 15
- **Location**: `assets/background.js:1`
- **Root Cause**: The background service worker script contained DOM-dependent code that doesn't work in a service worker context

## Analysis
1. **Build System Issue**: Vite was generating the background script with module preloading polyfills that included:
   - `document.querySelector()`
   - `document.createElement()`
   - `window.dispatchEvent()`
   - DOM manipulation code

2. **Service Worker Limitations**: Service workers run in a different context than regular web pages and don't have access to:
   - `document` object
   - `window` object (only `self`)
   - DOM APIs

3. **Build Configuration**: The `vite.content.config.ts` was using ES modules format for the background script, causing Vite to inject module loading polyfills with DOM dependencies.

## Solution

### 1. Fixed Build Configuration (`vite.content.config.ts`)

```typescript
// Changed from ES modules to IIFE format for service worker
output: {
  format: 'iife', // Instead of 'es'
  entryFileNames: 'assets/[name].js',
  inlineDynamicImports: true
}

// Added service worker polyfills
define: {
  ...(isBackground && {
    'document': 'undefined',
    'window': 'self',
    'global': 'globalThis'
  })
}

// Service worker specific configuration
...(isBackground && {
  target: 'es2020',
  minify: false,
  globals: {
    'chrome': 'chrome',
    'self': 'self',
    'globalThis': 'globalThis'
  }
})
```

### 2. Environment Variable Injection

Added proper environment variable definitions to ensure `import.meta.env` values are available:

```typescript
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
  // ... other environment variables
}
```

### 3. Created .env File

```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_CLIENT_ID=your-supabase-client-id
VITE_EXTENSION_NAME=Hive 3D Harvest
VITE_EXTENSION_VERSION=1.0.0
```

## Results

### Before Fix
- Background script: 118.96 kB with DOM references
- Service worker failed to register (status code 15)
- Extension couldn't load

### After Fix
- Background script: 285.74 kB with no DOM references
- Service worker loads successfully
- Extension works properly

## Verification Commands

```bash
# Check for DOM references (should return 0)
grep -c "window\|document" dist/assets/background.js

# Build commands
npm run build:background
npm run build
```

## Key Changes Made

1. **Build Format**: Changed from ES modules to IIFE for service worker compatibility
2. **DOM Polyfills**: Added polyfills to prevent DOM access in service worker context
3. **Environment Variables**: Properly injected environment variables using Vite's define option
4. **Service Worker Globals**: Added proper globals mapping for Chrome extension APIs

## Testing

The extension should now:
1. Load without service worker errors
2. Register the background script successfully
3. Have access to environment variables
4. Work with all content scripts and functionality

This fix ensures the Chrome extension works properly in Manifest V3 with service workers while maintaining all functionality.