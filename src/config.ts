// Supabase configuration
export const SUPABASE_CONFIG = {
    url: 'https://tdutfrehwalqpriivgvq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdXRmcmVod2FscXByaWl2Z3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTE0NzAsImV4cCI6MjA0ODk4NzQ3MH0.ZpsuO0tHZQzaAImE4sFVn5GsliF72vEqugM7R5hU1Sg',
    serviceRole: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdXRmcmVod2FscXByaWl2Z3ZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQxMTQ3MCwiZXhwIjoyMDQ4OTg3NDcwfQ.dX1ef0hk517RGAvwPjLshmjdbHwBJqRINRoRuW6xKXg',
    // Add the table name that stores the materials
    materialsTable: 'materials',
    organizationId: 'f6a86ed5-2b1b-4b41-8421-80c2a5a17720'
};

// Extension configuration
export const EXTENSION_CONFIG = {
    name: 'Print Hive Scrapper',
    version: '1.0.0',
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
};