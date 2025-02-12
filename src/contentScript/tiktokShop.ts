import { debugLog } from '../utils/debug';

interface OrderData {
  orderId: string;
  username: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    sku?: string;
  }>;
}

// Helper function to redact order number
const redactOrderNumber = (orderId: string): string => {
  if (orderId.length < 11) return orderId; // Return as is if too short
  const first4 = orderId.slice(0, 4);
  const last6 = orderId.slice(-6);
  return `${first4}****${last6}`;
};

// Function to create the print modal
const createPrintModal = (orderData: OrderData, onClose: () => void) => {
  const modal = document.createElement('div');
  modal.className = 'print-modal-overlay';
  modal.id = `print-modal-${orderData.orderId}`; // Add unique ID

  const modalContent = document.createElement('div');
  modalContent.className = 'print-modal';

  // Preview title (only visible in modal)
  const previewTitle = document.createElement('h2');
  previewTitle.textContent = 'Print Preview';
  previewTitle.classList.add('preview-only');

  // Print title
  const printTitle = document.createElement('h2');
  printTitle.textContent = 'The Enchanted Hollow';
  printTitle.classList.add('print-only');

  const orderDetails = document.createElement('div');
  orderDetails.className = 'order-details';

  // Order number with redaction
  const orderNumber = document.createElement('p');
  orderNumber.textContent = `Order #${redactOrderNumber(orderData.orderId)}`;

  // Customer name
  const customerName = document.createElement('p');
  customerName.textContent = `Customer: ${orderData.username}`;

  // Date in compact format
  const date = new Date(orderData.orderDate);
  const orderDate = document.createElement('p');
  orderDate.textContent = `Date: ${date.toLocaleDateString()}`;

  // Items list
  const itemsList = document.createElement('div');
  itemsList.className = 'items-list';

  const itemsUl = document.createElement('ul');
  orderData.items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} (${item.quantity})${item.sku ? ` - ${item.sku}` : ''}`;
    itemsUl.appendChild(li);
  });

  // Actions (only visible in modal)
  const actions = document.createElement('div');
  actions.className = 'modal-actions preview-only';

  const printButton = document.createElement('button');
  printButton.className = 'print-button';
  printButton.textContent = 'Print';
  printButton.onclick = () => {
    window.print();
  };

  const closeButton = document.createElement('button');
  closeButton.className = 'close-button';
  closeButton.textContent = 'Close';
  closeButton.onclick = onClose;

  // Assemble the modal
  itemsList.appendChild(itemsUl);
  orderDetails.appendChild(orderNumber);
  orderDetails.appendChild(customerName);
  orderDetails.appendChild(orderDate);
  orderDetails.appendChild(itemsList);

  modalContent.appendChild(previewTitle);
  modalContent.appendChild(printTitle);
  modalContent.appendChild(orderDetails);
  modalContent.appendChild(actions);

  actions.appendChild(printButton);
  actions.appendChild(closeButton);

  modal.appendChild(modalContent);
  return modal;
};

// Extract order data from TR elements
const extractOrderData = (orderRows: HTMLTableRowElement[]): OrderData | null => {
  try {
    if (orderRows.length < 2) return null;

    const firstRow = orderRows[0];
    const secondRow = orderRows[1];

    // Extract order ID from the order ID link
    const orderIdElement = firstRow.querySelector('.order_id_number');
    const orderId = orderIdElement?.textContent?.trim() || '';
    
    // Extract username from the first row
    const usernameElement = firstRow.querySelector('.line-clamp-2.w-full.whitespace-normal.text-p4-regular.break-word');
    const username = usernameElement?.textContent?.trim() || '';

    // Extract order date from the first row
    const dateElement = firstRow.querySelector('.sc-hkwnrn.fLiXBY');
    const orderDate = dateElement?.textContent?.trim() || '';

    // Extract items from the second row
    const items = [];
    const itemNameElement = secondRow.querySelector('.line-clamp-2.w-full.whitespace-normal.text-p4-regular.break-word');
    const itemVariantElement = secondRow.querySelector('.sc-bsipQr.ldUoNQ');
    const skuElement = secondRow.querySelector('.line-clamp-2.w-full.whitespace-normal.text-p4-regular.break-word[style*="color: var(--theme-arco-color-text-3)"]');
    const quantityElement = secondRow.querySelector('.sc-bsipQr.ijbzcX');

    if (itemNameElement || itemVariantElement || skuElement) {
      const name = [
        itemNameElement?.textContent?.trim(),
        itemVariantElement?.textContent?.trim()
      ].filter(Boolean).join(' - ');

      const sku = skuElement?.textContent?.trim()?.replace('Seller SKU:', '')?.trim();
      const quantityMatch = quantityElement?.textContent?.match(/×\s*(\d+)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

      items.push({
        name,
        quantity,
        sku
      });
    }

    const orderData = {
      orderId,
      username,
      orderDate,
      items
    };

    debugLog('extractOrderData', 'Extracted order data', orderData);
    return orderData;
  } catch (error) {
    debugLog('extractOrderData', 'Error extracting order data', error);
    return null;
  }
};

// Show print modal
const showPrintModal = (orderData: OrderData) => {
  debugLog('showPrintModal', 'Showing print modal for order', { orderId: orderData.orderId });
  
  // Remove any existing print modals
  document.querySelectorAll('.print-modal-overlay').forEach(modal => modal.remove());

  const modalContainer = document.createElement('div');
  modalContainer.id = 'print-modal-container';

  const closeModal = () => {
    debugLog('showPrintModal', 'Closing modal');
    modalContainer.remove();
  };

  // Add event listener for print completion
  const handlePrint = () => {
    window.removeEventListener('afterprint', handlePrint);
    closeModal();
  };
  window.addEventListener('afterprint', handlePrint);

  const modal = createPrintModal(orderData, closeModal);
  modalContainer.appendChild(modal);
  document.body.appendChild(modalContainer);

  // Add click handler to close modal when clicking outside
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closeModal();
    }
  });
};

// Create and inject print button
const createPrintButton = (orderData: OrderData): HTMLButtonElement => {
  debugLog('createPrintButton', 'Creating print button for order', { orderId: orderData.orderId });
  const button = document.createElement('button');
  button.textContent = 'Print Bag Label';
  button.className = 'print-bag-label-btn';
  button.dataset.orderId = orderData.orderId; // Add data attribute for tracking
  button.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent any default behavior
    showPrintModal(orderData);
  });
  return button;
};

// Main function to process the orders table
const processOrdersTable = (tbody: HTMLTableSectionElement) => {
  debugLog('processOrdersTable', 'Processing orders table');
  const rows = Array.from(tbody.getElementsByTagName('tr'));
  
  // Process rows in groups of 3 (as per requirements)
  for (let i = 0; i < rows.length; i += 3) {
    const orderRows = rows.slice(i, i + 2); // Get first two rows, ignore spacing row
    const orderData = extractOrderData(orderRows as HTMLTableRowElement[]);
    
    if (orderData) {
      const button = createPrintButton(orderData);
      // Find the actions container in the last cell of the second row
      const lastCell = orderRows[1]?.querySelector('td[width="170"]');
      const buttonContainer = lastCell?.querySelector('[data-log_main_order_id] .sc-bsipQr.gtPBuy');
      
      if (buttonContainer) {
        debugLog('processOrdersTable', 'Adding print button to order', { orderId: orderData.orderId });
        // Create a wrapper div to match TikTok's style
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.width = '100%';
        buttonWrapper.appendChild(button);
        buttonContainer.appendChild(buttonWrapper);
      } else {
        debugLog('processOrdersTable', 'Could not find button container for order', { 
          orderId: orderData.orderId,
          lastCellExists: !!lastCell,
          lastCellHtml: lastCell?.innerHTML
        });
      }
    }
  }
};

// Function to find the orders table
const findOrdersTable = (): HTMLTableElement | null => {
  const tables = document.getElementsByTagName('table');
  const tableRegex = /\blistTableContainer-?[a-zA-Z0-9]*\b/;
  
  for (const table of tables) {
    if (tableRegex.test(table.className)) {
      debugLog('findOrdersTable', 'Found table matching pattern', { className: table.className });
      return table;
    }
  }
  return null;
};

// Set up mutation observer to handle dynamic updates
const setupMutationObserver = (tbody: HTMLTableSectionElement) => {
  debugLog('setupMutationObserver', 'Setting up mutation observer');
  const observer = new MutationObserver((mutations) => {
    // Only process if we see new rows added
    const hasNewRows = mutations.some(mutation => 
      mutation.type === 'childList' && 
      Array.from(mutation.addedNodes).some(node => 
        node instanceof HTMLElement && node.tagName === 'TR'
      )
    );

    if (hasNewRows) {
      debugLog('setupMutationObserver', 'New rows detected, processing table');
      processOrdersTable(tbody);
    }
  });

  observer.observe(tbody, { childList: true });
  debugLog('setupMutationObserver', 'Started observing table body for new rows');
};

// Initialize when the page is ready
const initialize = () => {
  debugLog('initialize', 'Starting TikTok Shop content script initialization');
  debugLog('initialize', 'Current URL', window.location.href);
  
  if (window.location.href.includes('seller-us.tiktok.com/order')) {
    debugLog('initialize', 'On TikTok Shop orders page, setting up features');
    
    // Function to check for table
    const checkForTable = () => {
      const table = findOrdersTable();
      if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
          debugLog('initialize', 'Found orders table, processing', {
            tableRows: tbody.children.length,
            parentElement: tbody.parentElement?.tagName
          });
          
          // Process the table once and set up observer for future changes
          processOrdersTable(tbody);
          setupMutationObserver(tbody);
          return true;
        }
      }
      return false;
    };

    // Try immediately
    if (!checkForTable()) {
      debugLog('initialize', 'Table not found immediately, will retry with interval');
      
      // Set up an interval to check for the table
      let attempts = 0;
      const maxAttempts = 20; // Try for 10 seconds
      const interval = setInterval(() => {
        attempts++;
        debugLog('initialize', `Attempt ${attempts} to find table`);
        
        if (checkForTable() || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts >= maxAttempts) {
            debugLog('initialize', 'Failed to find table after max attempts', {
              tables: Array.from(document.getElementsByTagName('table')).map(t => ({
                className: t.className,
                rowCount: t.rows.length,
                matches: /\blistTableContainer-?[a-zA-Z0-9]*\b/.test(t.className)
              }))
            });
          }
        }
      }, 500); // Check every 500ms
    }
  } else {
    debugLog('initialize', 'Not on TikTok Shop orders page, skipping setup', {
      currentUrl: window.location.href,
      expectedUrl: 'seller-us.tiktok.com/order'
    });
  }
};

// Start the initialization
debugLog('contentScript', 'TikTok Shop content script loaded');
if (document.readyState === 'loading') {
  debugLog('contentScript', 'Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  debugLog('contentScript', 'Document already loaded, initializing immediately');
  initialize();
} 