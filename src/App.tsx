import { useState, useEffect } from 'react'
import './App.css'
import { EXTENSION_CONFIG } from './config'

interface TabInfo {
  isAmazon: boolean;
  url: string | null;
  productId: string | null;
  status: 'checking' | 'exists' | 'not_exists' | 'not_amazon';
}

function App() {
  const [tabInfo, setTabInfo] = useState<TabInfo>({
    isAmazon: false,
    url: null,
    productId: null,
    status: 'checking'
  });

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url) {
          setTabInfo(prev => ({ ...prev, status: 'not_amazon' }));
          return;
        }

        const url = new URL(tab.url);
        const isAmazon = url.hostname.includes('amazon');
        const productIdMatch = isAmazon ? url.pathname.match(/\/dp\/([A-Z0-9]+)/) : null;
        const productId = productIdMatch ? productIdMatch[1] : null;

        setTabInfo({
          isAmazon,
          url: tab.url,
          productId,
          status: isAmazon && productId ? 'checking' : 'not_amazon'
        });

        // If it's an Amazon product page with a valid product ID, check status
        if (isAmazon && productId) {
          // Send message to background script
          chrome.runtime.sendMessage(
            { 
              type: 'CHECK_PRODUCT',
              data: { productId, url: tab.url }
            },
            (response) => {
              setTabInfo(prev => ({
                ...prev,
                status: response.exists ? 'exists' : 'not_exists'
              }));
            }
          );
        }
      } catch (error) {
        console.error('Error getting tab info:', error);
      }
    };

    getCurrentTab();
  }, []);

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
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Product ID: {tabInfo.productId}
        </div>
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
    </div>
  )
}

export default App