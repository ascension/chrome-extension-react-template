import { defineConfig } from 'vite'
import { resolve } from 'path'

const getInput = (mode: string) => {
  switch (mode) {
    case 'tiktok':
      return { tiktokShop: resolve(__dirname, 'src/contentScript/tiktokShop.ts') }
    case 'amazon':
      return { contentScript: resolve(__dirname, 'src/contentScript.ts') }
    case 'thangs':
      return { thangs: resolve(__dirname, 'src/contentScript/thangs.ts') }
    case 'background':
      return { background: resolve(__dirname, 'src/background.ts') }
    default:
      throw new Error(`Unknown mode: ${mode}`)
  }
}

export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: getInput(mode),
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name].js',
        extend: true
      }
    }
  }
})) 