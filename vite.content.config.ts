import { defineConfig } from 'vite'
import { resolve } from 'path'

const getInput = (mode: string): Record<string, string> => {
  switch (mode) {
    case 'tiktok':
      return { tiktokShop: resolve(__dirname, 'src/contentScript/tiktokShop.ts') }
    case 'tiktok-debug':
      return { tiktokShopDebug: resolve(__dirname, 'src/contentScript/tiktokShopDebug.ts') }
    case 'amazon':
      return { contentScript: resolve(__dirname, 'src/contentScript.ts') }
    case 'thangs':
      return { thangs: resolve(__dirname, 'src/contentScript/thangs.ts') }
    case 'background':
      return { background: resolve(__dirname, 'src/background.ts') }
    case 'patreon':
      return { patreon: resolve(__dirname, 'src/contentScript/patreon.ts') }
    case 'makerworld':
      return { makerworld: resolve(__dirname, 'src/contentScript/makerworld.ts') }
    default:
      throw new Error(`Unknown mode: ${mode}`)
  }
}

export default defineConfig(({ mode }) => {
  // Determine if we're building a content script or background script
  const isBackground = mode === 'background';
  
  return {
    define: {
      // Ensure environment variables are available as string constants
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_SUPABASE_CLIENT_ID': JSON.stringify(process.env.VITE_SUPABASE_CLIENT_ID || ''),
      'import.meta.env.VITE_EXTENSION_NAME': JSON.stringify(process.env.VITE_EXTENSION_NAME || ''),
      'import.meta.env.VITE_EXTENSION_VERSION': JSON.stringify(process.env.VITE_EXTENSION_VERSION || ''),
      'import.meta.env.MODE': JSON.stringify(mode),
      // Service worker polyfills to prevent DOM access
      ...(isBackground && {
        'document': 'undefined',
        'window': 'self',
        'global': 'globalThis'
      })
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      ...(isBackground && {
        // Special configuration for service worker
        target: 'es2020',
        minify: false, // Disable minification to see any remaining issues
      }),
      rollupOptions: {
        input: getInput(mode),
        output: {
          format: 'iife', // Use IIFE format for all scripts
          entryFileNames: 'assets/[name].js',
          inlineDynamicImports: true,
          ...(isBackground && {
            globals: {
              'chrome': 'chrome',
              'self': 'self',
              'globalThis': 'globalThis'
            }
          })
        },
        external: []
      }
    }
  }
}) 