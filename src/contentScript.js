// Function to extract product information from Amazon page
const extractProductInfo = () => {
    const productId = window.location.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1];
    
    if (!productId) return null;

    // Extract brand information
    const brandElement = document.querySelector('#bylineInfo');
    const brand = brandElement ? brandElement.textContent.replace('Visit the ', '').replace(' Store', '').trim() : null;

    // Extract color information
    const colorElement = document.querySelector('#variation_color_name .selection');
    const color = colorElement ? colorElement.textContent.trim() : null;

    // Extract specifications
    const specifications = {};
    const specTable = document.querySelector('#productDetails_techSpec_section_1');
    if (specTable) {
        specTable.querySelectorAll('tr').forEach(row => {
            const label = row.querySelector('th')?.textContent.trim();
            const value = row.querySelector('td')?.textContent.trim();
            if (label && value) {
                specifications[label] = value;
            }
        });
    }

    // Extract features
    const features = [];
    const featureList = document.querySelector('#feature-bullets');
    if (featureList) {
        featureList.querySelectorAll('li span').forEach(feature => {
            const text = feature.textContent.trim();
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

    return {
        productId,
        url: window.location.href,
        title: document.getElementById('productTitle')?.textContent?.trim(),
        price: document.querySelector('.a-price .a-offscreen')?.textContent?.trim(),
        brand,
        color,
        materialType,
        diameter,
        specifications,
        features
    };
};

// Function to add status indicator to the page
const addStatusIndicator = () => {
    const container = document.createElement('div');
    container.id = 'print-hive-status';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 5px;
        z-index: 9999;
        font-family: Arial, sans-serif;
    `;
    document.body.appendChild(container);
    return container;
};

// Function to create material in database
const createMaterial = async (productInfo) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                type: 'CREATE_MATERIAL',
                data: productInfo
            },
            (response) => {
                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response.error || 'Failed to create material'));
                }
            }
        );
    });
};

// Function to add title indicator
const addTitleIndicator = (exists, productInfo) => {
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

        // Add click handler
        indicator.addEventListener('click', async () => {
            try {
                indicator.textContent = '⏳ Adding to Print Hive...';
                indicator.style.backgroundColor = '#f0f0f0';
                indicator.style.cursor = 'wait';
                
                await createMaterial(productInfo);
                
                // Update indicators after successful creation
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
                
                const statusContainer = document.getElementById('print-hive-status');
                if (statusContainer) {
                    statusContainer.textContent = '✅ Product exists in database';
                    statusContainer.style.backgroundColor = '#e6ffe6';
                }
            } catch (error) {
                indicator.textContent = '❌ Failed to Add';
                indicator.style.backgroundColor = '#ffe6e6';
                indicator.style.cursor = 'pointer';
                console.error('Failed to create material:', error);
                
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
                errorMsg.textContent = `Error: ${error.message}`;
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
const checkProductStatus = async () => {
    const productInfo = extractProductInfo();
    if (!productInfo) return;

    const statusContainer = addStatusIndicator();
    statusContainer.textContent = 'Checking product status...';

    // Send message to background script
    chrome.runtime.sendMessage(
        { 
            type: 'CHECK_PRODUCT',
            data: productInfo
        },
        (response) => {
            if (response.exists) {
                statusContainer.textContent = '✅ Product exists in database';
                statusContainer.style.backgroundColor = '#e6ffe6';
                addTitleIndicator(true, productInfo);
            } else {
                statusContainer.textContent = '❌ Product not found in database';
                statusContainer.style.backgroundColor = '#ffe6e6';
                addTitleIndicator(false, productInfo);
            }
        }
    );
};

// Run when page loads
if (document.readyState === 'complete') {
    checkProductStatus();
} else {
    window.addEventListener('load', checkProductStatus);
}

// Listen for URL changes (for single-page navigation)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        checkProductStatus();
    }
}).observe(document, { subtree: true, childList: true });