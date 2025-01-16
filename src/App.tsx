import { useState, useEffect } from 'react'
import './App.css'
import { EXTENSION_CONFIG } from './config'
import { AuthProvider, useAuth } from './context/AuthContext'
import ColorAnalyzer from './ColorAnalyzer'

// Debug logging function
const debugLog = (source: string, message: string, data?: unknown) => {
  console.log(`[Print Hive Debug] ${source}:`, message, data || '');
};

interface ProductInfo {
  productId: string;
  url: string;
  title?: string;
  price?: string;
  brand?: string;
  color?: string;
  materialType?: string;
  diameter?: number;
  specifications?: Record<string, string>;
  features?: string[];
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface TabInfo {
  isAmazon: boolean;
  url: string | null;
  productId: string | null;
  status: 'checking' | 'exists' | 'not_exists' | 'not_amazon';
}

function AppContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showColorAnalyzer, setShowColorAnalyzer] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [tabInfo, setTabInfo] = useState<TabInfo>({
    isAmazon: false,
    url: null,
    productId: null,
    status: 'checking'
  });

  const { user, loading: authLoading, error, login, signup, logout } = useAuth()

  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [isColorAnalyzerMode] = useState(() => window.location.hash === '#/color-analyzer');

  // Get product info when in color analyzer mode
  useEffect(() => {
    if (isColorAnalyzerMode) {
      debugLog('ColorAnalyzer', 'Getting product info from background');
      chrome.runtime.sendMessage(
        { type: 'GET_PRODUCT_INFO' },
        (response) => {
          if (response.data) {
            debugLog('ColorAnalyzer', 'Received product info', response.data);
            setProductInfo(response.data);
          } else {
            debugLog('ColorAnalyzer', 'No product info received');
          }
        }
      );
    }
  }, [isColorAnalyzerMode]);

  const handleAddProduct = async (productData: ProductInfo, colors: string[]) => {
    debugLog('handleAddProduct', 'Adding product with colors', { 
      productId: productData.productId,
      colors: selectedColors 
    });
    debugger
    chrome.runtime.sendMessage(
      {
        type: 'ADD_PRODUCT',
        data: {
          ...productData,
          metadata: {
            ...productData.metadata,
            colors
          }
        }
      },
      (response) => {
        debugLog('handleAddProduct', 'Received add product response', response);
        if (response.success) {
          if (isColorAnalyzerMode) {
            debugLog('handleAddProduct', 'Closing color analyzer popup');
            window.close(); // Close the popup after successful addition
          } else {
            debugLog('handleAddProduct', 'Updating UI after successful addition');
            setTabInfo(prev => ({ ...prev, status: 'exists' }));
            setShowColorAnalyzer(false);
          }
        } else {
          debugLog('handleAddProduct', 'Failed to add product', response.error);
        }
      }
    );
  };

  const handleColorsSelected = (colors: string[]) => {
    debugger
    debugLog('handleColorsSelected', 'Colors selected', colors);
    setSelectedColors(colors);
    if (productInfo) {
      handleAddProduct(productInfo, colors);
    } else {
      debugLog('handleColorsSelected', 'No product info available');
    }
  };

  // Check current tab when not in color analyzer mode
  useEffect(() => {
    if (isColorAnalyzerMode) return;
    // Only check products if user is authenticated
    if (!user) return;

    const getCurrentTab = async () => {
      debugLog('getCurrentTab', 'Checking current tab');
      try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url) {
          debugLog('getCurrentTab', 'No URL found in current tab');
          setTabInfo(prev => ({ ...prev, status: 'not_amazon' }));
          return;
        }

        const url = new URL(tab.url);
        const isAmazon = url.hostname.includes('amazon');
        const productIdMatch = isAmazon ? url.pathname.match(/\/dp\/([A-Z0-9]+)/) : null;
        const productId = productIdMatch ? productIdMatch[1] : null;

        debugLog('getCurrentTab', 'Tab info', { isAmazon, productId, url: tab.url });

        setTabInfo({
          isAmazon,
          url: tab.url,
          productId,
          status: isAmazon && productId ? 'checking' : 'not_amazon'
        });

        // If it's an Amazon product page with a valid product ID, check status
        if (isAmazon && productId) {
          debugLog('getCurrentTab', 'Checking product status');
          // Send message to background script
          chrome.runtime.sendMessage(
            { 
              type: 'CHECK_PRODUCT',
              data: { productId, url: tab.url }
            },
            (response) => {
              debugLog('getCurrentTab', 'Product check response', response);
              setTabInfo(prev => ({
                ...prev,
                status: response.exists ? 'exists' : 'not_exists'
              }));
            }
          );
        }
      } catch (error) {
        debugLog('getCurrentTab', 'Error getting tab info', error);
        console.error('Error getting tab info:', error);
      }
    };

    getCurrentTab();
  }, [user, isColorAnalyzerMode]); // Re-run when user auth state changes

  const getStatusMessage = () => {
    switch (tabInfo.status) {
      case 'checking':
        return 'Checking product status...';
      case 'exists':
        return '✅ Product exists in database';
      case 'not_exists':
        return '❌ Product not found in database';
      case 'not_amazon':
        return 'Please navigate to an Amazon product page';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (tabInfo.status) {
      case 'exists':
        return '#e6ffe6';
      case 'not_exists':
        return '#ffe6e6';
      default:
        return '#f0f0f0';
    }
  };

  if (authLoading) {
    return (
      <div className="extension-popup" style={{ padding: '20px', width: '300px' }}>
        <div style={{ textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="extension-popup" style={{ padding: '20px', width: '300px' }}>
        <header style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '18px', margin: '0 0 5px 0' }}>
            {EXTENSION_CONFIG.name}
          </h1>
          <div style={{ fontSize: '12px', color: '#666' }}>
            v{EXTENSION_CONFIG.version}
          </div>
        </header>
        
        <div style={{ textAlign: 'center', padding: '0 20px' }}>
          <p style={{ marginBottom: '15px' }}>Please log in to use the extension</p>
          <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            
            const credentials: LoginCredentials = { email, password };
            debugLog('login', 'Attempting login', { email });
            
            if (isSignUp) {
              signup(credentials).catch(console.error);
            } else {
              login(credentials).catch(console.error);
            }
          }}>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginBottom: '8px'
                }}
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            {error && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '12px', 
                marginBottom: '10px' 
              }}>
                {error.message}
              </div>
            )}
            <button 
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                opacity: authLoading ? 0.7 : 1
              }}
            >
              {authLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
            </button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4CAF50',
              marginTop: '10px',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    );
  }

  // Show only ColorAnalyzer in color analyzer mode
  if (isColorAnalyzerMode) {
    debugLog('render', 'Rendering color analyzer mode');
    return (
      <div className="extension-popup" style={{ padding: '20px', width: '800px' }}>
        {productInfo && (
          <ColorAnalyzer
            initialImageUrl={productInfo.imageUrl}
            onColorsSelected={handleColorsSelected}
            onClose={() => window.close()}
          />
        )}
      </div>
    );
  }

  // Normal extension popup view
  debugLog('render', 'Rendering normal popup view', { status: tabInfo.status });
  return (
    <div className="extension-popup" style={{ 
      padding: '20px', 
      width: showColorAnalyzer ? '800px' : '300px',
      transition: 'width 0.3s ease-in-out'
    }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '18px', margin: '0 0 5px 0' }}>
          {EXTENSION_CONFIG.name}
        </h1>
        <div style={{ fontSize: '12px', color: '#666' }}>
          v{EXTENSION_CONFIG.version}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: '5px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          {user.email}
          <button 
            onClick={logout}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div 
        style={{ 
          padding: '10px', 
          borderRadius: '5px',
          backgroundColor: getStatusColor(),
          marginBottom: '15px'
        }}
      >
        {getStatusMessage()}
      </div>

      {tabInfo.isAmazon && tabInfo.productId && (
        <>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Product ID: {tabInfo.productId}
          </div>
          {tabInfo.status === 'not_exists' && !showColorAnalyzer && (
            <button
              onClick={() => {
                debugLog('UI', 'Opening color analyzer');
                setShowColorAnalyzer(true);
              }}
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Add to Print Hive
            </button>
          )}
        </>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <strong>Instructions:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Navigate to an Amazon product page</li>
          <li>The extension will automatically check if the product exists in the database</li>
          <li>A status indicator will appear on the page</li>
        </ul>
      </div>

      {showColorAnalyzer && (
        <div style={{ marginTop: '20px' }}>
          <ColorAnalyzer
            initialImageUrl={tabInfo.url || undefined}
            onColorsSelected={handleColorsSelected}
            onClose={() => {
              debugLog('UI', 'Closing color analyzer');
              setShowColorAnalyzer(false);
            }}
          />
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;