/// <reference lib="webworker" />
/// <reference lib="webworker.iterable" />

declare const self: ServiceWorkerGlobalScope;

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from './config'

// Log immediately to verify script loading
console.log('[Print Hive] Background script loading...');

// Log environment variables
console.log('[Print Hive] Environment variables:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '[REDACTED]' : undefined,
  VITE_SUPABASE_CLIENT_ID: import.meta.env.VITE_SUPABASE_CLIENT_ID ? '[REDACTED]' : undefined,
  VITE_EXTENSION_NAME: import.meta.env.VITE_EXTENSION_NAME,
  VITE_EXTENSION_VERSION: import.meta.env.VITE_EXTENSION_VERSION,
  MODE: import.meta.env.MODE
});

// Debug log types
interface DebugLogEntry {
  timestamp: string;
  source: string;
  message: string;
  data?: unknown;
}

// Store debug logs in memory
const debugLogs: DebugLogEntry[] = [];

// Debug logging function with timestamp
const debugLog = (source: string, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[Print Hive Debug] [${timestamp}] ${source}: ${message}`;
  console.log(logMessage, data || '');

  // Store log in memory (keep last 100 logs)
  debugLogs.push({ timestamp, source, message, data });
  if (debugLogs.length > 100) {
    debugLogs.shift();
  }
};

// Log service worker initialization
debugLog('ServiceWorker', 'Starting initialization');

// Service worker lifecycle events
self.addEventListener('install', (event: ExtendableEvent) => {
  debugLog('ServiceWorker', 'Install event', event);
  // Force activation
  event.waitUntil(
    Promise.resolve().then(() => {
      debugLog('ServiceWorker', 'Skipping waiting');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  debugLog('ServiceWorker', 'Activate event', event);
  // Claim all clients
  event.waitUntil(
    Promise.resolve().then(() => {
      debugLog('ServiceWorker', 'Claiming clients');
      return self.clients.claim();
    })
  );
});

// Log unhandled errors
self.addEventListener('error', (event: ErrorEvent) => {
  debugLog('ServiceWorker', 'Unhandled error', event);
});

// Log unhandled promise rejections
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  debugLog('ServiceWorker', 'Unhandled promise rejection', event);
});

// Message types and interfaces
type MessageType = 'CHECK_PRODUCT' | 'ADD_PRODUCT' | 'SHOW_LOGIN' | 'OPEN_COLOR_ANALYZER' | 'GET_PRODUCT_INFO' | 'DEBUG_LOG';

interface ProductInfo {
  productId: string
  url: string
  title?: string
  price?: string
  brand?: string
  metadata?: {
    colors?: Array<string>
  }
  materialType?: string
  diameter?: number
  specifications?: Record<string, string>
  features?: string[]
  imageUrl?: string
}

interface CheckProductResponse {
  exists: boolean
  error?: string
}

interface Material {
  id: string;
  name: string;
  brand?: string;
  material_type: string;
  organization_id: string;
  color?: string;
  diameter: number;
  category: string;
  asin: string;
  metadata: Record<string, unknown>;
}

interface AddProductResponse {
  success: boolean;
  error?: string;
  material?: Material;
}

interface BaseMessage {
  type: MessageType;
  data: ProductInfo | Record<string, unknown>;
}

interface CheckProductMessage extends BaseMessage {
  type: 'CHECK_PRODUCT';
  data: ProductInfo;
}

interface AddProductMessage extends BaseMessage {
  type: 'ADD_PRODUCT';
  data: ProductInfo;
}

interface ShowLoginMessage extends Omit<BaseMessage, 'data'> {
  type: 'SHOW_LOGIN';
}

interface OpenColorAnalyzerMessage extends BaseMessage {
  type: 'OPEN_COLOR_ANALYZER';
  data: ProductInfo;
}

interface GetProductInfoMessage extends Omit<BaseMessage, 'data'> {
  type: 'GET_PRODUCT_INFO';
}

interface DebugLogMessage extends BaseMessage {
  type: 'DEBUG_LOG';
  data: {
    source: string;
    message: string;
    data?: unknown;
  };
}

type Message = CheckProductMessage | AddProductMessage | ShowLoginMessage | OpenColorAnalyzerMessage | GetProductInfoMessage | DebugLogMessage;

// Store current product info for color analyzer
let currentProductInfo: ProductInfo | null = null;

debugLog('ServiceWorker', 'Initializing Supabase client', {
  url: SUPABASE_CONFIG.url,
  materialsTable: SUPABASE_CONFIG.materialsTable,
  organizationId: SUPABASE_CONFIG.organizationId
});

// Initialize Supabase with chrome.storage adapter
const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      storage: {
        getItem: async (key: string) => {
          const { [key]: value } = await chrome.storage.local.get(key)
          return value
        },
        setItem: async (key: string, value: string) => {
          await chrome.storage.local.set({ [key]: value })
        },
        removeItem: async (key: string) => {
          await chrome.storage.local.remove(key)
        }
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // Disable session detection in URL since we're using email/password
    }
  }
)

// Function to check if product exists in Supabase database
async function checkProductInDatabase(productInfo: ProductInfo): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_CONFIG.materialsTable)
      .select('*')
      .eq('asin', productInfo.productId)
      .single()

    if (error) {
      debugLog('checkProductInDatabase', 'Supabase query error', error);
      return false
    }

    return !!data
  } catch (error) {
    debugLog('checkProductInDatabase', 'Error checking product', error);
    return false
  }
}

// Main function to check product status
async function checkProduct(productId: string, url: string): Promise<CheckProductResponse> {
  debugLog('checkProduct', 'Checking product status', { productId, url });
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      debugLog('checkProduct', 'No authenticated session found');
      return { exists: false, error: 'Not authenticated' }
    }

    const exists = await checkProductInDatabase({ productId, url })
    debugLog('checkProduct', 'Product check result', { exists });
    return { exists }
  } catch (error) {
    debugLog('checkProduct', 'Error checking product', error);
    return { exists: false, error: 'Internal error' }
  }
}

// Function to add a product to the database
async function addProduct(productInfo: ProductInfo): Promise<AddProductResponse> {
  debugLog('addProduct', 'Adding product', productInfo);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      debugLog('addProduct', 'No authenticated session found');
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from(SUPABASE_CONFIG.materialsTable)
      .insert([
        {
          name: productInfo.title || 'Unknown Product',
          brand: productInfo.brand,
          material_type: productInfo.materialType || 'PLA',
          organization_id: SUPABASE_CONFIG.organizationId,
          color: productInfo.metadata?.colors?.length ? productInfo?.metadata.colors?.[0] : '',
          diameter: productInfo.diameter || 1.75,
          category: 'filament',
          asin: productInfo.productId,
          metadata: {
            amazon_url: productInfo.url,
            price: productInfo.price,
            specifications: productInfo.specifications,
            features: productInfo.features,
            imageUrl: productInfo.imageUrl,
            colors: productInfo.metadata?.colors ?? []
          }
        }
      ])
      .select();

    if (error) {
      debugLog('addProduct', 'Error adding product to database', error);
      return { success: false, error: error.message };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      debugLog('addProduct', 'Failed to create material - no data returned');
      return { success: false, error: 'Failed to create material' };
    }

    const material = data[0] as Material;
    debugLog('addProduct', 'Material created successfully', material);

    // Create inventory item for the new material
    try {
      await supabase
        .from('inventory_items')
        .insert([{
          organization_id: SUPABASE_CONFIG.organizationId,
          material_id: material.id,
          minimum_stock: 1,
          quantity: 0
        }])
        .select()
        .single();
      debugLog('addProduct', 'Inventory item created successfully');
    } catch (error) {
      debugLog('addProduct', 'Error creating inventory item', error);
      // Don't throw here, as the material was created successfully
    }

    return { success: true, material };
  } catch (error) {
    debugLog('addProduct', 'Error in addProduct', error);
    return { success: false, error: 'Internal error' };
  }
}

// Function to show login popup
function showLoginPopup() {
  debugLog('showLoginPopup', 'Opening login popup');
  chrome.windows.create({
    url: 'index.html',
    type: 'popup',
    width: 400,
    height: 600
  });
}

// Function to show color analyzer popup
function showColorAnalyzerPopup(productInfo: ProductInfo) {
  debugLog('showColorAnalyzerPopup', 'Opening color analyzer with product info', productInfo);
  currentProductInfo = productInfo;
  debugLog('showColorAnalyzerPopup', 'Stored product info in memory');
  chrome.windows.create({
    url: 'index.html#/color-analyzer',
    type: 'popup',
    width: 800,
    height: 800
  });
}

// Helper type guard for message data
function isMessageData(data: unknown): data is ProductInfo {
  if (typeof data !== 'object' || data === null) return false;
  
  const msg = data as { productId?: unknown; url?: unknown; title?: unknown };
  return (
    typeof msg.productId === 'string' &&
    typeof msg.url === 'string' &&
    (msg.title === undefined || typeof msg.title === 'string')
  );
}

// Type guard for messages
function isValidMessage(message: unknown): message is Message {
  if (typeof message !== 'object' || message === null) return false;
  
  const msg = message as { type?: unknown; data?: unknown };
  if (!msg.type || typeof msg.type !== 'string') return false;

  switch (msg.type) {
    case 'CHECK_PRODUCT':
    case 'ADD_PRODUCT':
    case 'OPEN_COLOR_ANALYZER':
      return isMessageData(msg.data);
    case 'SHOW_LOGIN':
    case 'GET_PRODUCT_INFO':
      return true;
    case 'DEBUG_LOG':
      return typeof msg.data === 'object' && msg.data !== null;
    default:
      return false;
  }
}

debugLog('ServiceWorker', 'Setting up message listener');

// Message handler
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  debugLog('onMessage', 'Received message', message);
  if (!isValidMessage(message)) {
    debugLog('onMessage', 'Invalid message format');
    return false;
  }

  debugLog('onMessage', 'Message details', {
    type: message.type,
    sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
    url: sender.tab?.url
  });

  let debugLogData: DebugLogMessage['data'] | undefined;
  let checkResponse: CheckProductResponse | undefined;
  let productAddResponse: AddProductResponse | undefined;

  // Handle message asynchronously
  const handleMessage = async () => {
    try {
      debugLog('onMessage', 'Processing message', { type: message.type });
      
      switch (message.type) {
        case 'CHECK_PRODUCT': {
          debugLog('onMessage', 'Processing CHECK_PRODUCT', message.data);
          checkResponse = await checkProduct(message.data.productId, message.data.url);
          debugLog('onMessage', 'CHECK_PRODUCT response ready', checkResponse);
          sendResponse(checkResponse);
          break;
        }

        case 'ADD_PRODUCT': {
          debugLog('onMessage', 'Processing ADD_PRODUCT', message.data);
          productAddResponse = await addProduct(message.data);
          debugLog('onMessage', 'ADD_PRODUCT response ready', productAddResponse);
          sendResponse(productAddResponse);
          break;
        }

        case 'SHOW_LOGIN':
          debugLog('onMessage', 'Processing SHOW_LOGIN');
          showLoginPopup();
          sendResponse({ success: true });
          break;

        case 'OPEN_COLOR_ANALYZER':
          debugLog('onMessage', 'Processing OPEN_COLOR_ANALYZER', message.data);
          showColorAnalyzerPopup(message.data);
          sendResponse({ success: true });
          break;

        case 'GET_PRODUCT_INFO':
          debugLog('onMessage', 'Processing GET_PRODUCT_INFO');
          sendResponse({ data: currentProductInfo });
          debugLog('onMessage', 'Sent product info response', currentProductInfo);
          break;

        case 'DEBUG_LOG':
          if (debugLogData) {
            debugLog(debugLogData.source, debugLogData.message, debugLogData.data);
          }
          sendResponse({ success: true });
          break;

        default: {
          // At this point, message.type is not one of the known types
          const unknownMessage = message as { type: string };
          debugLog('onMessage', 'Unknown message type', unknownMessage.type);
          sendResponse({ error: 'Unknown message type' });
        }
      }
    } catch (error) {
      debugLog('onMessage', 'Error handling message', { type: message.type, error });
      sendResponse({ error: 'Failed to process message' });
    }
  };

  // Keep message channel open for async response
  handleMessage().catch(error => {
    debugLog('onMessage', 'Unhandled error in message handler', error);
    sendResponse({ error: 'Internal error' });
  });

  return true; // Keep message channel open
});

debugLog('ServiceWorker', 'Initialization complete');

// Store debug logs in service worker scope
interface ExtendedServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  debugLogs: DebugLogEntry[];
}

(self as ExtendedServiceWorkerGlobalScope).debugLogs = debugLogs;