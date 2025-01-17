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
}

// Debug logging function
const debugLog = (source: string, message: string, data?: unknown) => {
  // Log to console with special prefix for content script
  console.log(`[Print Hive Content Script] ${source}:`, message, data || '');
  
  // Send debug info to background script for centralized logging
  chrome.runtime.sendMessage({
    type: 'DEBUG_LOG',
    data: {
      source: `ContentScript:${source}`,
      message,
      data
    }
  }).catch(() => {
    // Ignore errors from sending debug logs
  });

  // Add visual debug element if in development
  if (process.env.NODE_ENV === 'development') {
    const debugContainer = document.getElementById('print-hive-debug') || createDebugContainer();
    const debugLine = document.createElement('div');
    debugLine.style.cssText = 'margin: 4px 0; font-family: monospace; font-size: 12px;';
    debugLine.textContent = `${source}: ${message} ${data ? JSON.stringify(data) : ''}`;
    debugContainer.appendChild(debugLine);
    
    // Keep only last 10 messages
    while (debugContainer.children.length > 10) {
      debugContainer.removeChild(debugContainer.firstChild!);
    }
  }
};

// Create debug container for visual feedback
const createDebugContainer = () => {
  const container = document.createElement('div');
  container.id = 'print-hive-debug';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    z-index: 9999;
    font-family: monospace;
    font-size: 12px;
  `;
  document.body.appendChild(container);
  return container;
};

// Function to get the currently selected variant image
const getCurrentVariantImage = (): string | undefined => {
  // Try to get image URL from data script tag first
  const imageDataScript = document.querySelector('script[data-a-state*="desktop-landing-image-data"]');
  if (imageDataScript) {
    try {
      const scriptContent = imageDataScript.textContent || '';
      const imageData = JSON.parse(scriptContent);
      if (imageData.landingImageUrl) {
        return imageData.landingImageUrl.replace(/\._.*_\./, '.'); // Remove size constraints
      }
    } catch (e) {
      debugLog('getCurrentVariantImage', 'Failed to parse image data script', e);
    }
  }

  // Try to get image from the currently selected variant
  const selectors = [
    'li.image.item.selected img.a-dynamic-image',  // New layout selected variant
    '#main-image-container img.selected',          // Alternative layout selected
    '#imgBlkFront.selected',                      // Legacy layout selected
    '#landingImage.selected',                     // Legacy layout selected
    '#landingImage[data-old-hires]',             // Image with high-res data attribute
    '#imgBlkFront[data-old-hires]',              // Alternative image with high-res
    '#landingImage',                             // Fallback to main image
    '#imgBlkFront',                              // Fallback to alternative main
    '#main-image-container img'                   // Final fallback
  ];

  for (const selector of selectors) {
    const image = document.querySelector(selector);
    if (image instanceof HTMLImageElement) {
      // Try to get high resolution version first
      const hiRes = image.getAttribute('data-old-hires');
      if (hiRes) {
        return hiRes;
      }
      // Fallback to src, removing Amazon's size constraints
      return image.src.replace(/\._[^.]*(\.[^.]*)$/, '$1');
    }
  }

  return undefined;
};

// Function to extract product information from Amazon page
const extractProductInfo = (): ProductInfo | null => {
  debugLog('extractProductInfo', 'Starting product info extraction');
  
  const productId = window.location.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1];
  if (!productId) {
    debugLog('extractProductInfo', 'No product ID found in URL');
    return null;
  }

  // Extract image URL using the getCurrentVariantImage helper
  const imageUrl = getCurrentVariantImage();
  debugLog('extractProductInfo', imageUrl ? 'Found image URL' : 'No image URL found', imageUrl);

  // Extract brand information
  const brandElement = document.querySelector('#bylineInfo');
  const brand = brandElement ? 
    brandElement.textContent?.replace('Visit the ', '').replace(' Store', '').trim() : 
    null;

  // Extract color information
  const colorElement = document.querySelector('#variation_color_name .selection');
  const color = colorElement ? colorElement.textContent?.trim() : null;

  // Extract specifications
  const specifications: Record<string, string> = {};
  const specTable = document.querySelector('#productDetails_techSpec_section_1');
  if (specTable) {
    specTable.querySelectorAll('tr').forEach(row => {
      const label = row.querySelector('th')?.textContent?.trim();
      const value = row.querySelector('td')?.textContent?.trim();
      if (label && value) {
        specifications[label] = value;
      }
    });
  }

  // Extract features
  const features: string[] = [];
  const featureList = document.querySelector('#feature-bullets');
  if (featureList) {
    featureList.querySelectorAll('li span').forEach(feature => {
      const text = feature.textContent?.trim();
      if (text) features.push(text);
    });
  }

  // Try to extract material type from title and features
  let materialType = 'PLA'; // Default to PLA
  const titleText = document.getElementById('productTitle')?.textContent?.toLowerCase() || '';
  const allText = [...features, titleText].join(' ').toLowerCase();
  if (allText.includes('petg')) materialType = 'PETG';
  else if (allText.includes('abs')) materialType = 'ABS';
  else if (allText.includes('tpu')) materialType = 'TPU';
  else if (allText.includes('nylon')) materialType = 'Nylon';

  // Try to extract diameter from specifications and features
  let diameter = 1.75; // Default to 1.75mm
  const diameterMatch = allText.match(/(\d+\.?\d*)\s*mm/);
  if (diameterMatch) {
    const extractedDiameter = parseFloat(diameterMatch[1]);
    if (extractedDiameter > 1 && extractedDiameter < 4) { // Sanity check for common filament diameters
      diameter = extractedDiameter;
    }
  }

  const productInfo = {
    productId,
    url: window.location.href,
    title: document.getElementById('productTitle')?.textContent?.trim(),
    price: document.querySelector('.a-price .a-offscreen')?.textContent?.trim(),
    brand: brand || undefined,
    color: color || undefined,
    materialType,
    diameter,
    specifications,
    features,
    imageUrl
  };

  debugLog('extractProductInfo', 'Extracted product info', productInfo);
  return productInfo;
};

// Function to add status indicator to the page
const addStatusIndicator = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.id = 'print-hive-status';
  
  // Create close button
  const closeButton = document.createElement('span');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    display: inline-block;
    margin-left: 10px;
    cursor: pointer;
    font-size: 18px;
    color: #666;
    vertical-align: middle;
  `;
  closeButton.addEventListener('click', () => {
    container.remove();
  });

  // Create content container for status text
  const contentContainer = document.createElement('span');
  contentContainer.style.cssText = `
    display: inline-block;
    vertical-align: middle;
  `;
  contentContainer.id = 'print-hive-status-text';

  // Add drag functionality
  let isDragging = false;
  let currentX: number;
  let currentY: number;
  let initialX: number;
  let initialY: number;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - container.offsetLeft;
    initialY = e.clientY - container.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      container.style.left = `${currentX}px`;
      container.style.top = `${currentY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 8px 15px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 5px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    cursor: move;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 5px;
  `;

  container.appendChild(contentContainer);
  container.appendChild(closeButton);
  document.body.appendChild(container);
  return container;
};

// Function to add title indicator
const addTitleIndicator = (exists: boolean, productInfo: ProductInfo): void => {
  const productTitle = document.getElementById('productTitle');
  if (!productTitle) return;

  // Remove existing indicator if present
  const existingIndicator = document.getElementById('print-hive-title-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement('span');
  indicator.id = 'print-hive-title-indicator';
  
  if (exists) {
    indicator.style.cssText = `
      display: inline-block;
      margin-left: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: normal;
      vertical-align: middle;
      background-color: #e6ffe6;
      color: #006400;
    `;
    indicator.textContent = '✅ In Print Hive';
  } else {
    indicator.style.cssText = `
      display: inline-block;
      margin-left: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: normal;
      vertical-align: middle;
      background-color: #ffe6e6;
      color: #8b0000;
      cursor: pointer;
      border: 1px solid #8b0000;
      transition: all 0.2s ease;
    `;
    indicator.textContent = '❌ Add to Print Hive';
    
    // Add hover effect
    indicator.addEventListener('mouseover', () => {
      indicator.style.backgroundColor = '#ff9999';
    });
    
    indicator.addEventListener('mouseout', () => {
      indicator.style.backgroundColor = '#ffe6e6';
    });

    // Add click handler to open ColorAnalyzer
    indicator.addEventListener('click', () => {
      try {
        debugLog('addTitleIndicator', 'Add to Print Hive button clicked');
        indicator.textContent = '⏳ Opening Color Analyzer...';
        indicator.style.backgroundColor = '#f0f0f0';
        indicator.style.cursor = 'wait';
        
        // Send message to open ColorAnalyzer with product info
        chrome.runtime.sendMessage(
          {
            type: 'OPEN_COLOR_ANALYZER',
            data: productInfo
          },
          (response) => {
            debugLog('addTitleIndicator', 'Received open color analyzer response', response);
            if (response.success) {
              // Update title indicator to success state
              indicator.textContent = '✅ In Print Hive';
              indicator.style.backgroundColor = '#e6ffe6';
              indicator.style.color = '#006400';
              indicator.style.cursor = 'default';
              indicator.style.border = 'none';
              
              // Update status container if it exists
              const statusContainer = document.getElementById('print-hive-status');
              if (statusContainer) {
                statusContainer.textContent = '✅ Product exists in database';
                statusContainer.style.backgroundColor = '#e6ffe6';
              }
              
              // Remove click handler since it's now in the database
              indicator.replaceWith(indicator.cloneNode(true));
            } else {
              indicator.textContent = '❌ Failed to Open';
              indicator.style.backgroundColor = '#ffe6e6';
              indicator.style.cursor = 'pointer';
            }
          }
        );
      } catch (error) {
        debugLog('addTitleIndicator', 'Error opening color analyzer', error);
        indicator.textContent = '❌ Failed to Add';
        indicator.style.backgroundColor = '#ffe6e6';
        indicator.style.cursor = 'pointer';
        
        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
          position: fixed;
          top: 70px;
          right: 20px;
          padding: 10px 20px;
          background-color: #ffe6e6;
          border: 1px solid #8b0000;
          border-radius: 5px;
          z-index: 9999;
          font-family: Arial, sans-serif;
          color: #8b0000;
        `;
        errorMsg.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        document.body.appendChild(errorMsg);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
          errorMsg.remove();
        }, 5000);
      }
    });
  }

  productTitle.appendChild(indicator);
};

// Main function to check product status
const checkProductStatus = async (): Promise<void> => {
  debugLog('checkProductStatus', 'Starting product status check');
  const productInfo = extractProductInfo();
  if (!productInfo) return;

  const statusContainer = addStatusIndicator();
  const statusText = statusContainer.querySelector('#print-hive-status-text');
  if (statusText) {
    statusText.textContent = 'Checking product status...';
  }

  try {
    // Send message to background script
    debugLog('checkProductStatus', 'Sending CHECK_PRODUCT message', productInfo);
    
    await new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { 
          type: 'CHECK_PRODUCT',
          data: productInfo
        },
        (response) => {
          if (chrome.runtime.lastError) {
            debugLog('checkProductStatus', 'Error sending message', chrome.runtime.lastError);
            const statusText = statusContainer.querySelector('#print-hive-status-text');
            if (statusText instanceof HTMLElement) {
              statusText.textContent = '❌ Error checking product';
            }
            statusContainer.style.backgroundColor = '#ffe6e6';
            reject(chrome.runtime.lastError);
            return;
          }

          debugLog('checkProductStatus', 'Received check product response', response);
          if (response.error === 'Not authenticated') {
            const statusText = statusContainer.querySelector('#print-hive-status-text');
            if (statusText instanceof HTMLElement) {
              statusText.textContent = '🔒 Please log in to Print Hive';
              statusContainer.style.backgroundColor = '#fff3cd';
              statusText.style.color = '#856404';
            }
            chrome.runtime.sendMessage({ type: 'SHOW_LOGIN' });
            resolve();
            return;
          }

          if (response.exists) {
            const statusText = statusContainer.querySelector('#print-hive-status-text');
            if (statusText instanceof HTMLElement) {
              statusText.textContent = '✅ Product exists in database';
              statusContainer.style.backgroundColor = '#e6ffe6';
            }
            addTitleIndicator(true, productInfo);
          } else {
            const statusText = statusContainer.querySelector('#print-hive-status-text');
            if (statusText instanceof HTMLElement) {
              statusText.textContent = '❌ Product not found in database';
              statusContainer.style.backgroundColor = '#ffe6e6';
            }
            addTitleIndicator(false, productInfo);
          }
          resolve();
        }
      );
    });
  } catch (error) {
    debugLog('checkProductStatus', 'Error checking product status', error);
    const statusText = statusContainer.querySelector('#print-hive-status-text');
    if (statusText instanceof HTMLElement) {
      statusText.textContent = '❌ Error checking product';
      statusContainer.style.backgroundColor = '#ffe6e6';
    }
  }
};

// Run when page loads
debugLog('init', 'Checking document ready state', { readyState: document.readyState });
if (document.readyState === 'complete') {
  debugLog('init', 'Document already complete, running checkProductStatus');
  checkProductStatus();
} else {
  debugLog('init', 'Document not ready, adding load event listener');
  window.addEventListener('load', () => {
    debugLog('init', 'Page loaded, running checkProductStatus');
    checkProductStatus();
  });
}

// Initialize state variables for URL and image tracking
let lastUrl = location.href;
let lastImageUrl: string | undefined;
debugLog('init', 'Setting up change observers', { initialUrl: lastUrl });

// Create mutation observer for both URL and variant changes
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  const currentImageUrl = getCurrentVariantImage();
  
  // Check if either URL or image has changed
  if (currentUrl !== lastUrl || currentImageUrl !== lastImageUrl) {
    debugLog('change', 'Product changed', { 
      urlChanged: currentUrl !== lastUrl,
      imageChanged: currentImageUrl !== lastImageUrl,
      from: { url: lastUrl, image: lastImageUrl },
      to: { url: currentUrl, image: currentImageUrl }
    });
    
    lastUrl = currentUrl;
    lastImageUrl = currentImageUrl;
    checkProductStatus();
  }
});

// Start observing with configuration for variant changes
observer.observe(document, { 
  subtree: true, 
  childList: true,
  attributes: true, 
  attributeFilter: ['class', 'src', 'selected'] 
});

debugLog('init', 'Content script initialization complete');