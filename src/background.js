import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

// Initialize Supabase client with configuration
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRole);

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CHECK_PRODUCT') {
        checkProductInDatabase(message.data)
            .then(exists => {
                sendResponse({ exists });
            })
            .catch(error => {
                console.error('Error checking product:', error);
                sendResponse({ exists: false, error: error.message });
            });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    }

    if (message.type === 'CREATE_MATERIAL') {
        createMaterial(message.data)
            .then(result => {
                sendResponse({ success: true, data: result });
            })
            .catch(error => {
                console.error('Error creating material:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true;
    }
});

// Function to check if product exists in Supabase database
async function checkProductInDatabase(productInfo) {
    try {
        const { data, error } = await supabase
            .from(SUPABASE_CONFIG.materialsTable)
            .select('*')
            .eq('asin', productInfo.productId);

        if (error) {
            console.error('Supabase query error:', JSON.stringify(error));
            return false;
        }

        console.log('checkProductInDatabase', JSON.stringify(data));

        if (data.length <= 0) {
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Error checking product in database:', error);
        return false;
    }
}

// Function to create a new material in the database
async function createMaterial(materialInfo) {
    try {
        const material = {
            name: materialInfo.title,
            brand: materialInfo.brand,
            material_type: materialInfo.materialType || 'PLA', // Default to PLA if not specified
            organization_id: SUPABASE_CONFIG.organizationId,
            color: materialInfo.color,
            diameter: materialInfo.diameter || 1.75, // Default to 1.75mm if not specified
            category: 'filament',
            asin: materialInfo.productId,
            metadata: {
                amazon_url: materialInfo.url,
                price: materialInfo.price,
                specifications: materialInfo.specifications,
                features: materialInfo.features
            }
        };

        const { data, error } = await supabase
            .from(SUPABASE_CONFIG.materialsTable)
            .insert([material])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creating material:', error);
        throw error;
    }
}

// Log when the background script is loaded
console.log('Print Hive Scrapper background script loaded');