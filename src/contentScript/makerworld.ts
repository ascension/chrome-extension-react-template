// Types for MakerWorld model information
interface MakerWorldModelInfo {
  modelId: string;
  url: string;
  name: string;
  designer: string;
  images: string[];
  source: 'makerworld';
  metadata?: {
    modelUrl?: string;
    [key: string]: unknown;
  };
}

// Function to extract model information from MakerWorld page
const extractMakerWorldInfo = (): MakerWorldModelInfo | null => {
  try {
    // Extract model ID from URL
    const match = window.location.pathname.match(/\/models\/(\d+)-/);
    const modelId = match ? match[1] : null;
    if (!modelId) return null;

    // Extract title
    const titleElement = document.querySelector('h1.title-for-share');
    const name = titleElement?.textContent?.trim() || '';

    // Extract designer
    const designerElement = document.querySelector('span.user_name');
    const designer = designerElement?.textContent?.trim() || '';

    // Extract images from swiper-wrapper
    const images: string[] = [];
    const imageElements = document.querySelectorAll('div.swiper-wrapper img');
    imageElements.forEach((img) => {
      if (images.length < 6) {
        const src = (img as HTMLImageElement).src;
        if (src && !images.includes(src)) images.push(src);
      }
    });

    if (!name || images.length === 0) return null;

    return {
      modelId,
      url: window.location.href,
      name,
      designer,
      images,
      source: 'makerworld',
      metadata: {
        modelUrl: window.location.href,
      },
    };
  } catch (error) {
    return null;
  }
};

// Function to check if current page is a MakerWorld model page
const isMakerWorldModelPage = () => {
  return /\/models\/(\d+)-/.test(window.location.pathname);
};

// Confirmation modal and save button logic (mirroring Patreon)
const createConfirmationModal = (
  modelInfo: MakerWorldModelInfo,
  onSave: () => void
) => {
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

  const createField = (
    label: string,
    value: string,
    key: keyof MakerWorldModelInfo | 'designer'
  ) => {
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
      background: #fff;
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

  form.appendChild(createField('Name', modelInfo.name, 'name'));
  form.appendChild(createField('Designer', modelInfo.designer || '', 'designer'));
  form.appendChild(createField('Model URL', modelInfo.url, 'url'));

  // Add images preview with remove option
  const imagesContainer = document.createElement('div');
  imagesContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    margin-top: 16px;
  `;

  modelInfo.images.forEach((url) => {
    const imgWrapper = document.createElement('div');
    imgWrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100px;
    `;

    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: 4px;
      display: block;
    `;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove image';
    removeBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(0,0,0,0.7);
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 16px;
      cursor: pointer;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modelInfo.images = modelInfo.images.filter((imgUrl) => imgUrl !== url);
      imgWrapper.remove();
    });

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(removeBtn);
    imagesContainer.appendChild(imgWrapper);
  });

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    margin-top: 24px;
    justify-content: flex-end;
  `;

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

  form.appendChild(imagesContainer);
  form.appendChild(buttonContainer);
  modalContent.appendChild(title);
  modalContent.appendChild(form);
  modal.appendChild(modalContent);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  return modal;
};

const addSaveButton = (modelInfo: MakerWorldModelInfo) => {
  const existingButton = document.getElementById('print-hive-save-button');
  if (existingButton) {
    existingButton.remove();
  }

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

  const status = document.createElement('div');
  status.style.cssText = `
    padding: 8px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    display: none;
  `;

  button.addEventListener('click', () => {
    const modal = createConfirmationModal(modelInfo, async () => {
      try {
        button.disabled = true;
        button.style.backgroundColor = '#6c757d';
        button.textContent = 'Saving...';
        status.style.display = 'block';
        status.textContent = 'Saving model to Print Hive...';
        status.style.backgroundColor = '#f8f9fa';

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
      }
    });
    document.body.appendChild(modal);
  });

  chrome.runtime.sendMessage({
    type: 'CHECK_MODEL_EXISTS',
    data: {
      source: modelInfo.source,
      sourceId: modelInfo.modelId,
    },
  }).then((response) => {
    if (response.exists) {
      button.disabled = true;
      button.style.backgroundColor = '#6c757d';
      button.textContent = 'Already Saved';
    }
  }).catch(() => {});

  container.appendChild(button);
  container.appendChild(status);
  document.body.appendChild(container);
};

// Main function to initialize MakerWorld integration
const initMakerWorld = () => {
  if (!isMakerWorldModelPage()) return;
  setTimeout(() => {
    const modelInfo = extractMakerWorldInfo();
    if (modelInfo) {
      addSaveButton(modelInfo);
    }
  }, 1000);
};

// Run when page loads
if (document.readyState === 'complete') {
  initMakerWorld();
} else {
  window.addEventListener('load', initMakerWorld);
}

// Watch for URL changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    const existingButton = document.getElementById('print-hive-save-button');
    if (existingButton) {
      existingButton.remove();
    }
    initMakerWorld();
  }
}).observe(document, { subtree: true, childList: true });

export { extractMakerWorldInfo, initMakerWorld }; 