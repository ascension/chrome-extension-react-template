import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'public/manifest.json',
                    dest: '.'
                }
            ]
        })
    ],
    build: {
        outDir: 'build',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                background: resolve(__dirname, 'src/background.js'),
                contentScript: resolve(__dirname, 'src/contentScript.js')
            },
            output: {
                entryFileNames: function (chunkInfo) {
                    // Ensure background and content scripts maintain their names
                    if (['background', 'contentScript'].includes(chunkInfo.name)) {
                        return 'assets/[name].js';
                    }
                    return 'assets/[name]-[hash].js';
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        },
        sourcemap: true,
        // Ensure proper bundling for extension
        target: 'esnext',
        minify: false, // Easier for debugging
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    // Configure optimization for extension
    optimizeDeps: {
        include: ['@supabase/supabase-js']
    }
});
