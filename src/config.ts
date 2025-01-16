// Supabase configuration
export const SUPABASE_CONFIG = {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    clientId: import.meta.env.VITE_SUPABASE_CLIENT_ID,
    // Add the table name that stores the materials
    materialsTable: 'materials',
    organizationId: 'f6a86ed5-2b1b-4b41-8421-80c2a5a17720'
} as const;

// Extension configuration
export const EXTENSION_CONFIG = {
    name: import.meta.env.VITE_EXTENSION_NAME,
    version: import.meta.env.VITE_EXTENSION_VERSION,
    // Add any other configuration options here
    statusIndicator: {
        exists: {
            backgroundColor: '#e6ffe6',
            text: '✅ Product exists in database'
        },
        notExists: {
            backgroundColor: '#ffe6e6',
            text: '❌ Product not found in database'
        },
        checking: {
            backgroundColor: '#f0f0f0',
            text: 'Checking product status...'
        }
    }
} as const;