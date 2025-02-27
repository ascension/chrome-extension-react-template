import { debugLog } from '../utils/debug';

// Types for Thangs.com model information
interface ThangsModelInfo {
  modelId: string;
  url: string;
  name: string;
  designer: string;
  images: string[];
  source: 'thangs';
  metadata?: {
    modelUrl?: string;
    tags?: string[];
    designer?: string;
    source_type?: 'thangs' | 'patreon';
    source?: string;
    source_id?: string;
    source_url?: string;
    [key: string]: string | string[] | 'thangs' | 'patreon' | undefined;
  };
}

// Function to extract model information from Thangs.com page
const extractThangsInfo = (): ThangsModelInfo | null => {
  try {
    // Add visual highlight to elements we find
    const highlightElement = (element: Element | null, label: string) => {
      if (element && process.env.NODE_ENV === 'development') {
        element.setAttribute('style', 'outline: 2px solid #007bff; position: relative;');
        const badge = document.createElement('div');
        badge.textContent = `Found ${label}`;
        badge.style.cssText = `
          position: absolute;
          top: -20px;
          left: 0;
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 10000;
        `;
        element.appendChild(badge);
      }
    };

    // Extract model ID from URL - now handles both URL formats
    const modelId = window.location.pathname.match(/(?:\/model\/|\/3d-model\/.+-)(\d+)$/)?.[1];
    if (!modelId) {
      debugLog('extractThangsInfo', 'No model ID found in URL', { path: window.location.pathname });
      return null;
    }
    debugLog('extractThangsInfo', 'Found model ID', { modelId });

    // Extract model name with fallbacks
    const nameElement = 
      document.querySelector('[data-testid="model-name"]') || 
      document.querySelector('h1') ||
      document.querySelector('.model-title');
    const name = nameElement?.textContent?.trim() || '';
    if (!name) {
      debugLog('extractThangsInfo', 'No model name found', { 
        tried: ['[data-testid="model-name"]', 'h1', '.model-title']
      });
      return null;
    }
    debugLog('extractThangsInfo', 'Found model name', { 
      name, 
      selector: nameElement?.matches('[data-testid="model-name"]') ? 'data-testid' 
        : nameElement?.matches('h1') ? 'h1' 
        : 'model-title'
    });
    highlightElement(nameElement, 'Model Name');

    // Extract designer name with fallbacks
    const designerElement = 
      document.querySelector('[data-testid="model-designer"]') ||
      document.querySelector('.designer-name') ||
      document.querySelector('.model-designer') ||
      document.querySelector('a[class*="ModelDesigner_ProfileLink"]') ||
      document.querySelector('a[href^="/designer/"]');
    const designer = designerElement?.textContent?.trim() || '';
    if (!designer) {
      debugLog('extractThangsInfo', 'No designer name found', {
        tried: [
          '[data-testid="model-designer"]',
          '.designer-name',
          '.model-designer',
          'a[class*="ModelDesigner_ProfileLink"]',
          'a[href^="/designer/"]'
        ]
      });
      return null;
    }
    debugLog('extractThangsInfo', 'Found designer name', { 
      designer,
      selector: designerElement?.matches('[data-testid="model-designer"]') ? 'data-testid'
        : designerElement?.matches('.designer-name') ? 'designer-name'
        : designerElement?.matches('.model-designer') ? 'model-designer'
        : designerElement?.matches('a[class*="ModelDesigner_ProfileLink"]') ? 'model-designer-profile-link'
        : 'designer-link'
    });
    highlightElement(designerElement, 'Designer');

    // Extract images with fallbacks
    const images: string[] = [];
    const imageElements = document.querySelectorAll(
      '[data-testid="model-image"] img, .model-images img, .model-gallery img, img[alt*="3d model"]'
    );
    
    imageElements.forEach((img, index) => {
      // Skip images that are part of related models
      if (img.closest('[class*="RelatedModels"]')) {
        debugLog('extractThangsInfo', 'Skipping related model image', { src: (img as HTMLImageElement).src });
        return;
      }

      const src = (img as HTMLImageElement).src;
      if (src) {
        images.push(src);
        highlightElement(img, `Image ${index + 1}`);
      }
    });

    if (images.length === 0) {
      debugLog('extractThangsInfo', 'No images found', {
        tried: ['[data-testid="model-image"] img', '.model-images img', '.model-gallery img', 'img[alt*="3d model"]']
      });
      return null;
    }
    debugLog('extractThangsInfo', 'Found images', { 
      count: images.length,
      urls: images
    });

    // Extract tags
    const tags: string[] = [];
    
    // Try to extract categories/tags from breadcrumbs
    const breadcrumbs = document.querySelectorAll('nav[aria-label="breadcrumb"] a, .breadcrumb a');
    breadcrumbs.forEach(crumb => {
      const text = crumb.textContent?.trim();
      if (text && text !== 'Home' && !text.includes('model')) {
        tags.push(text.toLowerCase());
      }
    });

    // Look for category tags or labels
    const categoryElements = document.querySelectorAll('[data-testid="model-category"], .category-tag, .model-category');
    categoryElements.forEach(element => {
      const text = element.textContent?.trim();
      if (text) {
        tags.push(text.toLowerCase());
      }
    });

    // Extract keywords from description
    const descriptionElement = document.querySelector('[data-testid="model-description"], .model-description');
    if (descriptionElement?.textContent) {
      const description = descriptionElement.textContent.toLowerCase();
      const commonKeywords = ['3d printer', 'fdm', 'resin', 'sla', 'pla', 'abs', 'petg', 'miniature', 'functional', 'decorative'];
      commonKeywords.forEach(keyword => {
        if (description.includes(keyword)) {
          tags.push(keyword);
        }
      });
    }

    debugLog('extractThangsInfo', 'Extracted tags', { tags });

    const modelInfo = {
      modelId,
      url: window.location.href,
      name,
      designer,
      images,
      source: 'thangs' as const,
      metadata: {
        modelUrl: window.location.href,
        tags: [...new Set(tags)], // Remove duplicates
      },
    };

    debugLog('extractThangsInfo', 'Successfully extracted all model info', modelInfo);
    return modelInfo;
  } catch (error) {
    debugLog('extractThangsInfo', 'Error extracting model info', error);
    return null;
  }
};

// Function to create the confirmation modal
const createConfirmationModal = (modelInfo: ThangsModelInfo, onSave: () => void) => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background-color: white;
    padding: 24px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    font-family: system-ui, -apple-system, sans-serif;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Save Model to Print Hive';
  title.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 20px;
    color: #333;
  `;

  const form = document.createElement('form');
  form.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;

  // Create input fields
  const createField = (label: string, value: string, key: keyof ThangsModelInfo | 'designer') => {
    const fieldContainer = document.createElement('div');
    fieldContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = label;
    fieldLabel.style.cssText = `
      font-size: 14px;
      color: #666;
      font-weight: 500;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.style.cssText = `
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      color: #333;
    `;
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (key === 'designer') {
        if (modelInfo.metadata) {
          modelInfo.metadata.designer = target.value;
        }
      } else {
        (modelInfo[key] as string) = target.value;
      }
    });

    fieldContainer.appendChild(fieldLabel);
    fieldContainer.appendChild(input);
    return fieldContainer;
  };

  // Add fields
  form.appendChild(createField('Name', modelInfo.name, 'name'));
  form.appendChild(createField('Designer', modelInfo.metadata?.designer || '', 'designer'));
  form.appendChild(createField('Model URL', modelInfo.url, 'url'));

  // Add images preview
  const imagesContainer = document.createElement('div');
  imagesContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    margin-top: 16px;
  `;

  modelInfo.images.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: 4px;
    `;
    imagesContainer.appendChild(img);
  });

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    margin-top: 24px;
    justify-content: flex-end;
  `;

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    padding: 8px 16px;
    border: 1px solid #ddd;
    background-color: white;
    color: #666;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  cancelButton.addEventListener('click', () => {
    modal.remove();
  });

  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Model';
  saveButton.style.cssText = `
    padding: 8px 16px;
    background-color: #000000;
    color: #39FF14;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    text-shadow: 0 0 5px rgba(57, 255, 20, 0.5);
  `;
  saveButton.addEventListener('click', (e) => {
    e.preventDefault();
    onSave();
    modal.remove();
  });

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(saveButton);

  // Assemble modal
  form.appendChild(imagesContainer);
  form.appendChild(buttonContainer);
  modalContent.appendChild(title);
  modalContent.appendChild(form);
  modal.appendChild(modalContent);

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  return modal;
};

// Function to add the "Save to Print Hive" button
const addSaveButton = (modelInfo: ThangsModelInfo) => {
  // Remove existing button if any
  const existingButton = document.getElementById('print-hive-save-button');
  if (existingButton) {
    existingButton.remove();
  }

  // Create button container
  const container = document.createElement('div');
  container.id = 'print-hive-save-button';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  `;

  // Create save button
  const button = document.createElement('button');
  button.textContent = 'Save to PrintHIV3D';
  button.style.cssText = `
    padding: 8px 16px;
    background-color: #000000;
    color: #39FF14;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    transition: all 0.2s;
    text-shadow: 0 0 5px rgba(57, 255, 20, 0.5);
  `;

  button.addEventListener('mouseover', () => {
    if (!button.disabled) {
      button.style.backgroundColor = '#1a1a1a';
      button.style.textShadow = '0 0 8px rgba(57, 255, 20, 0.8)';
    }
  });

  button.addEventListener('mouseout', () => {
    if (!button.disabled) {
      button.style.backgroundColor = '#000000';
      button.style.textShadow = '0 0 5px rgba(57, 255, 20, 0.5)';
    }
  });

  // Create status text
  const status = document.createElement('div');
  status.style.cssText = `
    padding: 8px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    display: none;
  `;

  // Add click handler
  button.addEventListener('click', () => {
    // Show confirmation modal
    const modal = createConfirmationModal(modelInfo, async () => {
      try {
        button.disabled = true;
        button.style.backgroundColor = '#6c757d';
        button.textContent = 'Saving...';
        status.style.display = 'block';
        status.textContent = 'Saving model to Print Hive...';
        status.style.backgroundColor = '#f8f9fa';

        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          type: 'CREATE_MODEL',
          data: modelInfo,
        });

        if (response.success) {
          button.style.backgroundColor = '#28a745';
          button.textContent = 'Saved to Print Hive';
          status.style.backgroundColor = '#d4edda';
          status.textContent = 'Model saved successfully!';
        } else {
          if (response.error === 'Duplicate model') {
            button.disabled = true;
            button.style.backgroundColor = '#6c757d';
            button.textContent = 'Already Saved';
            status.style.display = 'block';
            status.style.backgroundColor = '#f8d7da';
            status.textContent = response.message;
          } else {
            throw new Error(response.error || 'Failed to save model');
          }
        }
      } catch (error) {
        button.disabled = false;
        button.style.backgroundColor = '#dc3545';
        button.textContent = 'Error - Try Again';
        status.style.backgroundColor = '#f8d7da';
        status.textContent = error instanceof Error ? error.message : 'Failed to save model';
        debugLog('addSaveButton', 'Error saving model', error);
      }
    });
    document.body.appendChild(modal);
  });

  // Check if model already exists
  chrome.runtime.sendMessage({
    type: 'CHECK_MODEL_EXISTS',
    data: {
      source: modelInfo.source,
      sourceId: modelInfo.modelId
    },
  }).then(response => {
    if (response.exists) {
      button.disabled = true;
      button.style.backgroundColor = '#6c757d';
      button.textContent = 'Already Saved';
    }
  }).catch(error => {
    debugLog('addSaveButton', 'Error checking model status', error);
  });

  // Add elements to container
  container.appendChild(button);
  container.appendChild(status);
  document.body.appendChild(container);
};

// Add UI state management
let isUIEnabled = true;

// Check initial state
chrome.storage.local.get('contentScriptEnabled', (result) => {
  isUIEnabled = result.contentScriptEnabled !== false; // Default to true if not set
  if (isUIEnabled) {
    initThangs();
  } else {
    // Remove existing button if UI is disabled
    const existingButton = document.getElementById('print-hive-save-button');
    if (existingButton) {
      existingButton.remove();
    }
  }
});

// Listen for toggle messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_UI') {
    isUIEnabled = message.data.enabled;
    if (isUIEnabled) {
      initThangs();
    } else {
      const existingButton = document.getElementById('print-hive-save-button');
      if (existingButton) {
        existingButton.remove();
      }
    }
    sendResponse({ success: true });
  }
  return true;
});

// Function to check if we're on a model page
const isModelPage = () => {
  const path = window.location.pathname;
  debugLog('isModelPage', 'Checking path', { path });
  // Check for both /3d-model/ and designer/**/3d-model patterns
  const isModel = path.includes('/3d-model/') || 
                 (path.startsWith('/designer/') && path.includes('/3d-model/'));
  debugLog('isModelPage', `Path ${isModel ? 'is' : 'is not'} a model page`);
  return isModel;
};

// Main function to initialize Thangs integration
const initThangs = () => {
  if (!isUIEnabled) return;
  
  debugLog('initThangs', 'Initializing Thangs integration');
  
  if (!isModelPage()) {
    debugLog('initThangs', 'Not a model page, skipping');
    return;
  }
  debugLog('initThangs', 'On model page, attempting to extract info');

  // Add a small delay to ensure the page content is loaded
  setTimeout(() => {
    const modelInfo = extractThangsInfo();
    if (modelInfo) {
      debugLog('initThangs', 'Model info extracted successfully', modelInfo);
      addSaveButton(modelInfo);
    } else {
      debugLog('initThangs', 'Failed to extract model info');
    }
  }, 1000); // 1 second delay
};

// Run when page loads
if (document.readyState === 'complete') {
  initThangs();
} else {
  window.addEventListener('load', initThangs);
}

// Watch for URL changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initThangs();
  }
}).observe(document, { subtree: true, childList: true });

export { extractThangsInfo, addSaveButton, initThangs }; 