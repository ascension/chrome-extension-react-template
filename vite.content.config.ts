import { defineConfig } from 'vite'
import { resolve } from 'path'

const getInput = (mode: string) => {
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
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: getInput(mode),
        output: {
          format: isBackground ? 'es' : 'iife', // Use ES modules for background script
          entryFileNames: 'assets/[name].js',
          extend: !isBackground, // Only extend for content scripts
          inlineDynamicImports: isBackground // Inline dynamic imports for background script
        }
      }
    }
  }
}) 