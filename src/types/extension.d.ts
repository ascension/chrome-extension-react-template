// Product related types
interface ProductInfo {
    productId: string;
    url: string;
    title?: string;
    price?: string;
}

// Message types for communication between content script and background
interface CheckProductMessage {
    type: 'CHECK_PRODUCT';
    data: ProductInfo;
}

interface CheckProductResponse {
    exists: boolean;
    error?: string;
}

// Status types for UI
type ProductStatus = 'checking' | 'exists' | 'not_exists' | 'not_amazon';

interface StatusStyles {
    backgroundColor: string;
    text: string;
}

interface StatusConfig {
    [key: string]: StatusStyles;
}

// Extension configuration
interface ExtensionConfig {
    name: string;
    version: string;
    statusIndicator: {
        exists: StatusStyles;
        notExists: StatusStyles;
        checking: StatusStyles;
    };
}

// Supabase configuration
interface SupabaseConfig {
    url: string;
    anonKey: string;
    materialsTable: string;
}

// Export all types
declare global {
    interface Window {
        chrome: typeof chrome;
    }
}