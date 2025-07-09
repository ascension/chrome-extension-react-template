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

// Store printed orders to avoid duplicates
interface PrintedOrdersTracker {
  [orderId: string]: boolean;
}

// Global variable to track printed orders
const printedOrders: PrintedOrdersTracker = {};

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
  printTitle.textContent = 'TikTok Shop Order';
  printTitle.classList.add('print-only');
  printTitle.style.textAlign = 'center';
  printTitle.style.marginBottom = '20px';

  const orderDetails = document.createElement('div');
  orderDetails.className = 'order-details';

  // Order number with redaction
  const orderNumber = document.createElement('p');
  orderNumber.textContent = `Order #${redactOrderNumber(orderData.orderId)}`;
  orderNumber.style.fontWeight = 'bold';

  // Customer name
  const customerName = document.createElement('p');
  customerName.textContent = `Customer: ${orderData.username}`;

  // Date in compact format
  let dateStr = orderData.orderDate;
  try {
    // Try to format the date if it's a valid date string
    const date = new Date(orderData.orderDate);
    if (!isNaN(date.getTime())) {
      dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  } catch (e) {
    // If date parsing fails, use the original string
    debugLog('createPrintModal', 'Error formatting date', { error: e, originalDate: orderData.orderDate });
  }
  
  const orderDate = document.createElement('p');
  orderDate.textContent = `Date: ${dateStr}`;

  // Items list
  const itemsList = document.createElement('div');
  itemsList.className = 'items-list';

  const itemsTitle = document.createElement('h3');
  itemsTitle.textContent = 'Items:';
  itemsTitle.style.marginBottom = '8px';
  itemsTitle.style.marginTop = '16px';
  itemsList.appendChild(itemsTitle);

  const itemsUl = document.createElement('ul');
  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach(item => {
      const li = document.createElement('li');
      let itemText = `${item.name} (${item.quantity})`;
      if (item.sku) {
        itemText += ` - SKU: ${item.sku}`;
      }
      li.textContent = itemText;
      itemsUl.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No items found';
    itemsUl.appendChild(li);
  }

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

// Function to create multi-order print dialog
const createMultiOrderPrintDialog = (orders: OrderData[], onClose: () => void) => {
  debugLog('createMultiOrderPrintDialog', 'Creating multi-order print dialog', { orderCount: orders.length });
  
  const modal = document.createElement('div');
  modal.className = 'print-modal-overlay multi-order-dialog';

  const modalContent = document.createElement('div');
  modalContent.className = 'print-modal multi-order-content';

  // Dialog title
  const title = document.createElement('h2');
  title.textContent = 'Select Orders to Print';
  title.style.marginBottom = '16px';

  // Create order selection list
  const ordersList = document.createElement('div');
  ordersList.className = 'orders-selection-list';
  ordersList.style.maxHeight = '400px';
  ordersList.style.overflowY = 'auto';
  ordersList.style.marginBottom = '16px';
  ordersList.style.padding = '8px';
  ordersList.style.border = '1px solid #e5e6eb';
  ordersList.style.borderRadius = '4px';

  // Create checkboxes for each order
  const orderCheckboxes: { [orderId: string]: HTMLInputElement } = {};
  
  orders.forEach(order => {
    const orderRow = document.createElement('div');
    orderRow.style.display = 'flex';
    orderRow.style.alignItems = 'center';
    orderRow.style.padding = '8px 0';
    orderRow.style.borderBottom = '1px solid #f0f0f0';

    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `order-${order.orderId}`;
    checkbox.value = order.orderId;
    checkbox.style.marginRight = '12px';
    
    // If order has been printed before, add a visual indicator but still allow selection
    if (printedOrders[order.orderId]) {
      checkbox.checked = false; // Default unchecked for previously printed orders
      orderRow.style.opacity = '0.7'; // Visual indicator
    } else {
      checkbox.checked = true; // Default checked for new orders
    }
    
    orderCheckboxes[order.orderId] = checkbox;

    // Create label with order info
    const label = document.createElement('label');
    label.htmlFor = `order-${order.orderId}`;
    label.style.display = 'flex';
    label.style.flexDirection = 'column';
    label.style.flexGrow = '1';
    label.style.cursor = 'pointer';

    // Order ID and username
    const orderInfo = document.createElement('div');
    orderInfo.textContent = `Order #${redactOrderNumber(order.orderId)} - ${order.username}`;
    orderInfo.style.fontWeight = 'bold';

    // Order date
    const dateInfo = document.createElement('div');
    dateInfo.textContent = `Date: ${order.orderDate}`;
    dateInfo.style.fontSize = '0.9em';
    dateInfo.style.color = '#666';

    // Items count
    const itemsInfo = document.createElement('div');
    itemsInfo.textContent = `Items: ${order.items.length}`;
    itemsInfo.style.fontSize = '0.9em';
    itemsInfo.style.color = '#666';

    // Previously printed indicator
    if (printedOrders[order.orderId]) {
      const printedIndicator = document.createElement('div');
      printedIndicator.textContent = '(Previously printed)';
      printedIndicator.style.fontSize = '0.9em';
      printedIndicator.style.color = '#ff6b00';
      label.appendChild(printedIndicator);
    }

    // Assemble label
    label.appendChild(orderInfo);
    label.appendChild(dateInfo);
    label.appendChild(itemsInfo);

    // Assemble row
    orderRow.appendChild(checkbox);
    orderRow.appendChild(label);
    ordersList.appendChild(orderRow);
  });

  // Create action buttons container
  const actionButtons = document.createElement('div');
  actionButtons.style.display = 'flex';
  actionButtons.style.gap = '8px';
  actionButtons.style.marginBottom = '16px';

  // Select All button
  const selectAllButton = document.createElement('button');
  selectAllButton.textContent = 'Select All';
  selectAllButton.style.padding = '6px 12px';
  selectAllButton.style.backgroundColor = '#f2f3f5';
  selectAllButton.style.border = '1px solid #e5e6eb';
  selectAllButton.style.borderRadius = '4px';
  selectAllButton.style.cursor = 'pointer';
  selectAllButton.onclick = () => {
    Object.values(orderCheckboxes).forEach(checkbox => {
      checkbox.checked = true;
    });
  };

  // Clear All button
  const clearAllButton = document.createElement('button');
  clearAllButton.textContent = 'Clear All';
  clearAllButton.style.padding = '6px 12px';
  clearAllButton.style.backgroundColor = '#f2f3f5';
  clearAllButton.style.border = '1px solid #e5e6eb';
  clearAllButton.style.borderRadius = '4px';
  clearAllButton.style.cursor = 'pointer';
  clearAllButton.onclick = () => {
    Object.values(orderCheckboxes).forEach(checkbox => {
      checkbox.checked = false;
    });
  };

  // Add buttons to container
  actionButtons.appendChild(selectAllButton);
  actionButtons.appendChild(clearAllButton);

  // Create dialog action buttons
  const dialogActions = document.createElement('div');
  dialogActions.style.display = 'flex';
  dialogActions.style.justifyContent = 'space-between';
  dialogActions.style.marginTop = '16px';

  // Print Selected button
  const printButton = document.createElement('button');
  printButton.textContent = 'Print Selected Orders';
  printButton.style.padding = '8px 16px';
  printButton.style.backgroundColor = '#fe2c55';
  printButton.style.color = 'white';
  printButton.style.border = 'none';
  printButton.style.borderRadius = '4px';
  printButton.style.cursor = 'pointer';
  printButton.onclick = () => {
    // Get selected order IDs
    const selectedOrderIds = Object.entries(orderCheckboxes)
      .filter(([, checkbox]) => checkbox.checked)
      .map(([orderId]) => orderId);
    
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order to print.');
      return;
    }
    
    // Mark selected orders as printed
    selectedOrderIds.forEach(orderId => {
      printedOrders[orderId] = true;
    });
    
    // Get the selected orders data
    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.orderId));
    
    // Close this dialog
    onClose();
    
    // Print the selected orders
    printMultipleOrders(selectedOrders);
  };

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = '#f2f3f5';
  cancelButton.style.border = '1px solid #e5e6eb';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';
  cancelButton.onclick = onClose;

  // Assemble dialog actions
  dialogActions.appendChild(cancelButton);
  dialogActions.appendChild(printButton);

  // Assemble modal content
  modalContent.appendChild(title);
  modalContent.appendChild(actionButtons);
  modalContent.appendChild(ordersList);
  modalContent.appendChild(dialogActions);
  modal.appendChild(modalContent);

  return modal;
};

// Function to print multiple orders
const printMultipleOrders = (orders: OrderData[]) => {
  debugLog('printMultipleOrders', 'Printing multiple orders', { count: orders.length });
  
  if (orders.length === 0) {
    debugLog('printMultipleOrders', 'No orders to print');
    return;
  }
  
  // Remove any existing print containers
  document.querySelectorAll('#multi-order-print-modal-container').forEach(container => container.remove());
  
  // Create a container for all print content
  const printContainer = document.createElement('div');
  printContainer.className = 'multi-order-print-container';
  printContainer.style.padding = '20px';
  printContainer.style.backgroundColor = 'white';
  printContainer.style.borderRadius = '8px';
  printContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  printContainer.style.maxWidth = '800px';
  printContainer.style.width = '100%';
  printContainer.style.maxHeight = '80vh';
  printContainer.style.overflow = 'auto';
  printContainer.style.position = 'relative';
  
  // Add a title for the preview
  const previewTitle = document.createElement('h2');
  previewTitle.textContent = 'Print Preview';
  previewTitle.style.marginBottom = '20px';
  previewTitle.style.textAlign = 'center';
  previewTitle.classList.add('preview-only');
  printContainer.appendChild(previewTitle);
  
  // Add each order to the print container
  orders.forEach((order, index) => {
    // Create a print modal for each order
    const orderModal = createPrintModal(order, () => {});
    
    // Extract just the content part (not the overlay)
    const modalContent = orderModal.querySelector('.print-modal');
    if (modalContent) {
      // Clone the content to avoid reference issues
      const contentClone = modalContent.cloneNode(true) as HTMLElement;
      
      // Remove the preview title from the cloned content to avoid duplication
      const clonedPreviewTitle = contentClone.querySelector('.preview-only');
      if (clonedPreviewTitle) {
        clonedPreviewTitle.remove();
      }
      
      // Make sure print-only elements are visible in the print view
      contentClone.querySelectorAll('.print-only').forEach(el => {
        // Keep them hidden in the preview, but they'll be shown during print via CSS
        (el as HTMLElement).style.display = 'none';
      });
      
      // Add a separator between orders
      if (index > 0) {
        const separator = document.createElement('hr');
        separator.style.margin = '30px 0';
        separator.style.border = '1px dashed #ccc';
        separator.classList.add('preview-only');
        contentClone.insertBefore(separator, contentClone.firstChild);
      }
      
      // Add a page break after each order except the last one
      if (index < orders.length - 1) {
        const pageBreak = document.createElement('div');
        pageBreak.className = 'page-break';
        pageBreak.style.pageBreakAfter = 'always';
        pageBreak.style.marginBottom = '30px';
        pageBreak.style.borderBottom = '1px dashed #ccc';
        contentClone.appendChild(pageBreak);
      }
      
      printContainer.appendChild(contentClone);
    }
  });
  
  // Create a container for the print content
  const printModalContainer = document.createElement('div');
  printModalContainer.id = 'multi-order-print-modal-container';
  printModalContainer.style.position = 'fixed';
  printModalContainer.style.top = '0';
  printModalContainer.style.left = '0';
  printModalContainer.style.width = '100%';
  printModalContainer.style.height = '100%';
  printModalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  printModalContainer.style.zIndex = '10000';
  printModalContainer.style.display = 'flex';
  printModalContainer.style.justifyContent = 'center';
  printModalContainer.style.alignItems = 'center';
  printModalContainer.style.padding = '20px';
  
  // Add a close button for preview
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close Preview';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '20px';
  closeButton.style.right = '20px';
  closeButton.style.padding = '8px 16px';
  closeButton.style.backgroundColor = '#f2f3f5';
  closeButton.style.border = '1px solid #e5e6eb';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.zIndex = '10001';
  closeButton.classList.add('preview-only');
  
  closeButton.onclick = () => {
    printModalContainer.remove();
  };
  
  // Add a print button for preview
  const printButton = document.createElement('button');
  printButton.textContent = 'Print Now';
  printButton.style.position = 'absolute';
  printButton.style.top = '20px';
  printButton.style.right = '150px';
  printButton.style.padding = '8px 16px';
  printButton.style.backgroundColor = '#fe2c55';
  printButton.style.color = 'white';
  printButton.style.border = 'none';
  printButton.style.borderRadius = '4px';
  printButton.style.cursor = 'pointer';
  printButton.style.zIndex = '10001';
  printButton.classList.add('preview-only');
  
  printButton.onclick = () => {
    debugLog('printMultipleOrders', 'Print button clicked');
    
    // Make sure print-only elements are visible for printing
    const printOnlyElements = printContainer.querySelectorAll('.print-only');
    printOnlyElements.forEach(el => {
      (el as HTMLElement).style.display = 'block';
    });
    
    // Hide the buttons during print
    closeButton.style.display = 'none';
    printButton.style.display = 'none';
    
    // Print
    setTimeout(() => {
      window.print();
      
      // Reset display after printing
      setTimeout(() => {
        // Hide print-only elements again
        printOnlyElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });
        
        // Show the buttons again
        closeButton.style.display = 'block';
        printButton.style.display = 'block';
      }, 500);
    }, 100);
  };
  
  printContainer.appendChild(closeButton);
  printContainer.appendChild(printButton);
  printModalContainer.appendChild(printContainer);
  
  // Add to document
  document.body.appendChild(printModalContainer);
  
  // Set up the afterprint handler
  const handleAfterPrint = () => {
    // Don't remove the container automatically, let the user close it
    window.removeEventListener('afterprint', handleAfterPrint);
  };
  
  window.addEventListener('afterprint', handleAfterPrint);
};

// Extract order data from TR elements
const extractOrderData = (orderRows: HTMLTableRowElement[]): OrderData | null => {
  try {
    if (orderRows.length < 2) {
      debugLog('extractOrderData', 'Not enough rows to extract order data');
      return null;
    }

    const firstRow = orderRows[0];
    const secondRow = orderRows[1];
    
    debugLog('extractOrderData', 'Extracting data from rows', {
      firstRowCellCount: firstRow.cells.length,
      secondRowCellCount: secondRow.cells.length
    });

    // Extract order ID using data attributes which are more stable than classes
    let orderId = '';
    const orderIdElement = firstRow.querySelector('span[data-log_click_for="order_id_link"]');
    
    if (orderIdElement) {
      orderId = orderIdElement.textContent?.trim() || '';
      debugLog('extractOrderData', 'Found order ID using data-log_click_for attribute', { orderId });
    } else {
      // Try to find by content pattern - looking for elements containing "Order ID:" text
      const orderIdCandidates = Array.from(firstRow.querySelectorAll('span, div, a'))
        .filter(el => {
          const text = el.textContent?.trim() || '';
          return text.includes('Order ID:') || 
                 el.parentElement?.textContent?.includes('Order ID:') ||
                 /^\d{15,25}$/.test(text); // Look for long numeric strings that could be order IDs
        });
      
      if (orderIdCandidates.length > 0) {
        // Find the element that contains the actual order ID
        for (const candidate of orderIdCandidates) {
          const text = candidate.textContent?.trim() || '';
          if (/^\d{15,25}$/.test(text)) {
            // This looks like an order ID (long numeric string)
            orderId = text;
            debugLog('extractOrderData', 'Found order ID using numeric pattern', { orderId });
            break;
          }
          
          if (text.includes('Order ID:')) {
            // Extract the order ID from text like "Order ID: 123456789"
            const match = text.match(/Order ID:\s*(\d+)/);
            if (match && match[1]) {
              orderId = match[1];
              debugLog('extractOrderData', 'Found order ID in text containing "Order ID:"', { orderId });
              break;
            }
            
            // Check if the next element contains the order ID
            const nextElement = candidate.nextElementSibling;
            if (nextElement) {
              const nextText = nextElement.textContent?.trim() || '';
              if (/^\d{15,25}$/.test(nextText)) {
                orderId = nextText;
                debugLog('extractOrderData', 'Found order ID in next element after "Order ID:"', { orderId });
                break;
              }
            }
            
            // Check if there's a child element with the order ID
            const childElements = Array.from(candidate.querySelectorAll('*'));
            for (const child of childElements) {
              const childText = child.textContent?.trim() || '';
              if (/^\d{15,25}$/.test(childText)) {
                orderId = childText;
                debugLog('extractOrderData', 'Found order ID in child element', { orderId });
                break;
              }
            }
          }
        }
      }
      
      // If still not found, try looking for elements with specific attributes or patterns
      if (!orderId) {
        // Look for elements with data-log_main_order_id attribute
        const mainOrderIdElements = firstRow.querySelectorAll('[data-log_main_order_id]');
        if (mainOrderIdElements.length > 0) {
          const attrValue = mainOrderIdElements[0].getAttribute('data-log_main_order_id');
          if (attrValue && /^\d{15,25}$/.test(attrValue)) {
            orderId = attrValue;
            debugLog('extractOrderData', 'Found order ID using data-log_main_order_id attribute', { orderId });
          }
        }
      }
    }
    
    if (!orderId) {
      debugLog('extractOrderData', 'Could not find order ID');
      return null;
    }

    // Extract username - look for elements in the first row that might contain the username
    let username = '';
    // Try to find username near elements that might indicate customer information
    const usernameCandidates = Array.from(firstRow.querySelectorAll('div > div'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        // Usernames are typically short and don't contain special characters like dates or order IDs
        return text && 
               text.length > 0 && 
               text.length < 50 && 
               !text.includes('/') && // Avoid dates
               !text.includes(':') && // Avoid timestamps
               !text.match(/^\d{10,}$/); // Avoid order numbers
      });
    
    if (usernameCandidates.length > 0) {
      // Get the raw username text
      const rawUsername = usernameCandidates[0].textContent?.trim() || '';
      
      // Clean up the username by removing common unwanted text
      username = rawUsername
        .replace(/Start chat/i, '') // Remove "Start chat" text
        .replace(/Chat/i, '')       // Remove "Chat" text
        .replace(/Message/i, '')    // Remove "Message" text
        .replace(/Contact/i, '')    // Remove "Contact" text
        .trim();
      
      debugLog('extractOrderData', 'Found and cleaned username', { 
        rawUsername,
        cleanedUsername: username 
      });
    }

    // Extract order date - look for date patterns in the text
    let orderDate = '';
    // Improved date pattern matching
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/i;
    
    // First try to find standalone date elements
    const dateElements = Array.from(firstRow.querySelectorAll('span, div'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        return datePattern.test(text) && 
               // Make sure it's just a date and not mixed with other content
               text.length < 30;
      });
    
    if (dateElements.length > 0) {
      orderDate = dateElements[0].textContent?.trim() || '';
      debugLog('extractOrderData', 'Found order date in standalone element', { orderDate });
    } else {
      // If no standalone date element, try to extract date from mixed content
      const allText = firstRow.textContent || '';
      const dateMatch = allText.match(datePattern);
      if (dateMatch) {
        orderDate = dateMatch[0];
        debugLog('extractOrderData', 'Extracted order date from mixed content', { orderDate });
      }
    }

    // Extract items from the second row
    const items = [];
    
    // Look for product information in the second row
    // Product name is usually in a prominent position and might be longer text
    const productNameCandidates = Array.from(secondRow.querySelectorAll('div'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        return text.length > 15 && !text.includes('Seller SKU:');
      });
    
    let productName = '';
    if (productNameCandidates.length > 0) {
      productName = productNameCandidates[0].textContent?.trim() || '';
      debugLog('extractOrderData', 'Found product name', { productName });
    }
    
    // Look for variant information (usually shorter text near the product name)
    const variantCandidates = Array.from(secondRow.querySelectorAll('div'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        return text.length > 0 && 
               text.length < 30 && 
               text !== productName &&
               !text.includes('Seller SKU:') &&
               !text.match(/×\s*\d+/); // Not quantity
      });
    
    let variant = '';
    if (variantCandidates.length > 0) {
      variant = variantCandidates[0].textContent?.trim() || '';
      debugLog('extractOrderData', 'Found variant', { variant });
    }
    
    // Look for SKU information
    const skuElements = Array.from(secondRow.querySelectorAll('div'))
      .filter(el => el.textContent?.includes('Seller SKU:'));
    
    let sku = '';
    if (skuElements.length > 0) {
      const skuText = skuElements[0].textContent?.trim() || '';
      // Extract just the SKU value, removing "Seller SKU:" prefix and any trailing content
      if (skuText.includes('Seller SKU:')) {
        // Get the text after "Seller SKU:"
        const afterPrefix = skuText.split('Seller SKU:')[1].trim();
        
        // Look for common separators that might indicate the end of the SKU
        const possibleSeparators = ['Seller-signed', '×', 'creator', '-', '|', ',', ';'];
        
        let cleanedSku = afterPrefix;
        for (const separator of possibleSeparators) {
          if (afterPrefix.includes(separator)) {
            cleanedSku = afterPrefix.split(separator)[0].trim();
            break;
          }
        }
        
        // If no separators found, use the first "word" as the SKU
        // This handles cases where there might be spaces in the text
        if (cleanedSku === afterPrefix && cleanedSku.includes(' ')) {
          // Only use the first part if it looks like a valid SKU (alphanumeric with possible hyphens)
          const firstPart = cleanedSku.split(/\s+/)[0];
          if (/^[a-zA-Z0-9-]+$/.test(firstPart)) {
            cleanedSku = firstPart;
          }
        }
        
        sku = cleanedSku;
        debugLog('extractOrderData', 'Cleaned SKU from text', { 
          originalText: skuText,
          extractedSku: sku 
        });
      } else {
        sku = skuText;
        debugLog('extractOrderData', 'Using raw text as SKU', { sku });
      }
    }
    
    // Look for quantity information (typically contains "×" character)
    const quantityElements = Array.from(secondRow.querySelectorAll('div'))
      .filter(el => el.textContent?.match(/×\s*\d+/));
    
    let quantity = 1; // Default to 1 if not found
    if (quantityElements.length > 0) {
      const quantityText = quantityElements[0].textContent?.trim() || '';
      const quantityMatch = quantityText.match(/×\s*(\d+)/);
      if (quantityMatch) {
        quantity = parseInt(quantityMatch[1], 10);
        debugLog('extractOrderData', 'Found quantity', { quantity });
      }
    }

    // Combine product name and variant
    const name = [productName, variant].filter(Boolean).join(' - ');
    
    if (name) {
      items.push({
        name,
        quantity,
        sku
      });
    } else {
      debugLog('extractOrderData', 'Could not find product name');
      // Add a default item if we couldn't find a name
      items.push({
        name: 'Unknown Product',
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

    debugLog('extractOrderData', 'Successfully extracted order data', orderData);
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
  document.querySelectorAll('.print-modal-overlay, #print-modal-container').forEach(modal => modal.remove());

  // Create the modal container
  const modalContainer = document.createElement('div');
  modalContainer.id = 'print-modal-container';
  modalContainer.style.position = 'fixed';
  modalContainer.style.top = '0';
  modalContainer.style.left = '0';
  modalContainer.style.width = '100%';
  modalContainer.style.height = '100%';
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modalContainer.style.display = 'flex';
  modalContainer.style.justifyContent = 'center';
  modalContainer.style.alignItems = 'center';
  modalContainer.style.zIndex = '10000';
  modalContainer.style.padding = '20px';

  const closeModal = () => {
    debugLog('showPrintModal', 'Closing modal');
    modalContainer.remove();
  };

  // Add event listener for print completion
  const handlePrint = () => {
    // Don't close automatically after printing
    window.removeEventListener('afterprint', handlePrint);
  };
  window.addEventListener('afterprint', handlePrint);

  // Create the modal content
  const modal = createPrintModal(orderData, closeModal);
  
  // Style the modal content for better display
  const modalContent = modal.querySelector('.print-modal');
  if (modalContent) {
    (modalContent as HTMLElement).style.backgroundColor = 'white';
    (modalContent as HTMLElement).style.padding = '20px';
    (modalContent as HTMLElement).style.borderRadius = '8px';
    (modalContent as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    (modalContent as HTMLElement).style.maxWidth = '600px';
    (modalContent as HTMLElement).style.width = '100%';
    (modalContent as HTMLElement).style.maxHeight = '80vh';
    (modalContent as HTMLElement).style.overflow = 'auto';
    (modalContent as HTMLElement).style.position = 'relative';
    
    // Make sure print-only elements are hidden in the preview
    const printOnlyElements = modalContent.querySelectorAll('.print-only');
    printOnlyElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  }
  
  // Add a print button for preview
  const printButton = document.createElement('button');
  printButton.textContent = 'Print Now';
  printButton.style.position = 'absolute';
  printButton.style.top = '20px';
  printButton.style.right = '20px';
  printButton.style.padding = '8px 16px';
  printButton.style.backgroundColor = '#fe2c55';
  printButton.style.color = 'white';
  printButton.style.border = 'none';
  printButton.style.borderRadius = '4px';
  printButton.style.cursor = 'pointer';
  printButton.style.zIndex = '10001';
  printButton.classList.add('preview-only');
  
  printButton.onclick = () => {
    debugLog('showPrintModal', 'Print button clicked');
    
    // Make sure print-only elements are visible for printing
    if (modalContent) {
      const printOnlyElements = modalContent.querySelectorAll('.print-only');
      printOnlyElements.forEach(el => {
        (el as HTMLElement).style.display = 'block';
      });
    }
    
    // Hide the button during print
    printButton.style.display = 'none';
    
    // Print
    setTimeout(() => {
      window.print();
      
      // Reset display after printing
      setTimeout(() => {
        // Hide print-only elements again
        if (modalContent) {
          const printOnlyElements = modalContent.querySelectorAll('.print-only');
          printOnlyElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        }
        
        // Show the button again
        printButton.style.display = 'block';
      }, 500);
    }, 100);
  };
  
  // Add the print button to the modal content
  if (modalContent) {
    modalContent.appendChild(printButton);
  }
  
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
  
  // Style the button to match TikTok's button style without relying on classes
  button.type = 'button';
  button.dataset.orderId = orderData.orderId; // Add data attribute for tracking
  
  // Apply inline styles instead of relying on classes
  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '4px 16px',
    marginTop: '8px',
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: '500',
    color: '#1d2129',
    backgroundColor: '#f2f3f5',
    border: '1px solid #e5e6eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  });
  
  // Add hover effect
  button.onmouseover = () => {
    button.style.backgroundColor = '#e5e6eb';
  };
  
  button.onmouseout = () => {
    button.style.backgroundColor = '#f2f3f5';
  };
  
  // Set button text
  button.textContent = 'Print Label';
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPrintModal(orderData);
  });
  
  return button;
};

// Function to find the orders table
const findOrdersTable = (): HTMLTableElement | null => {
  const tables = document.getElementsByTagName('table');
  
  debugLog('findOrdersTable', 'Searching for tables', { 
    totalTables: tables.length
  });
  
  // Direct approach: Try to find any table that has rows with order information
  for (const table of tables) {
    const tbody = table.querySelector('tbody');
    if (!tbody) continue;
    
    const rows = tbody.getElementsByTagName('tr');
    if (rows.length < 2) continue; // Need at least 2 rows for an order
    
    // Check if we can extract order data from the first two rows
    const orderRows = Array.from(rows).slice(0, 2) as HTMLTableRowElement[];
    const testOrderData = extractOrderData(orderRows);
    
    if (testOrderData && testOrderData.orderId) {
      debugLog('findOrdersTable', 'Found table with extractable order data', { 
        orderId: testOrderData.orderId,
        rowCount: rows.length
      });
      return table;
    }
  }
  
  // Strategy 1: Look for tables with order ID elements
  for (const table of tables) {
    // Check if the table contains rows with order ID elements
    const hasOrderIdElements = table.querySelectorAll('span[data-log_click_for="order_id_link"]').length > 0;
    if (hasOrderIdElements) {
      debugLog('findOrdersTable', 'Found table with order ID elements', { 
        rowCount: table.rows.length
      });
      return table;
    }
  }
  
  // Strategy 2: Look for tables with data-log_main_order_id attributes
  for (const table of tables) {
    const hasOrderIdAttributes = table.querySelectorAll('[data-log_main_order_id]').length > 0;
    if (hasOrderIdAttributes) {
      debugLog('findOrdersTable', 'Found table with data-log_main_order_id attributes', { 
        rowCount: table.rows.length
      });
      return table;
    }
  }
  
  // Strategy 3: Look for tables with order-related content
  for (const table of tables) {
    // Check if any cell contains "Order ID:" text
    const hasCellsWithOrderId = Array.from(table.querySelectorAll('td'))
      .some(cell => cell.textContent?.includes('Order ID:'));
    
    if (hasCellsWithOrderId) {
      debugLog('findOrdersTable', 'Found table with cells containing "Order ID:" text', { 
        rowCount: table.rows.length
      });
      return table;
    }
  }
  
  // Strategy 4: Look for the largest table with multiple rows
  // (Orders table is usually the main content table)
  let largestTable: HTMLTableElement | null = null;
  let maxRows = 0;
  
  for (const table of tables) {
    if (table.rows.length > maxRows) {
      maxRows = table.rows.length;
      largestTable = table;
    }
  }
  
  if (largestTable && maxRows > 3) {
    debugLog('findOrdersTable', 'Using largest table as fallback', { 
      rowCount: maxRows
    });
    return largestTable;
  }
  
  // If we didn't find a table with any of our strategies
  debugLog('findOrdersTable', 'No suitable table found', {
    allTables: Array.from(tables).map(t => ({
      rowCount: t.rows.length
    }))
  });
  
  return null;
};

const processOrdersTable = (tbody: HTMLTableSectionElement) => {
  debugLog('processOrdersTable', 'Processing orders table');
  const rows = Array.from(tbody.getElementsByTagName('tr'));
  
  // Log the total number of rows for debugging
  debugLog('processOrdersTable', `Found ${rows.length} rows in the table`);
  
  // Collect all order data for the multi-order print feature
  const allOrders: OrderData[] = [];
  
  // Process rows in groups of 2 (as per the structure)
  for (let i = 0; i < rows.length; i += 2) {
    // Make sure we have at least 2 rows to process
    if (i + 1 >= rows.length) {
      debugLog('processOrdersTable', `Skipping incomplete order at row ${i} (not enough rows left)`);
      break;
    }
    
    const orderRows = rows.slice(i, i + 2); // Get first two rows
    
    // Log the rows we're processing for debugging
    debugLog('processOrdersTable', `Processing rows ${i} and ${i+1}`, {
      row1CellCount: orderRows[0].cells.length,
      row2CellCount: orderRows[1].cells.length,
      row1FirstCellText: orderRows[0].cells[0]?.textContent?.substring(0, 50),
      row2FirstCellText: orderRows[1].cells[0]?.textContent?.substring(0, 50)
    });
    
    const orderData = extractOrderData(orderRows as HTMLTableRowElement[]);
    
    if (orderData) {
      // Add to the collection of all orders
      allOrders.push(orderData);
      
      debugLog('processOrdersTable', `Successfully extracted order data for rows ${i} and ${i+1}`, {
        orderId: orderData.orderId,
        username: orderData.username,
        items: orderData.items.length
      });
      
      const button = createPrintButton(orderData);
      
      // Find the actions container in the last cell of the second row
      // Look for the last cell in the second row
      const cells = Array.from(orderRows[1].querySelectorAll('td'));
      const lastCell = cells.length > 0 ? cells[cells.length - 1] : null;
      
      debugLog('processOrdersTable', `Last cell for order ${orderData.orderId}`, {
        exists: !!lastCell,
        cellCount: cells.length,
        lastCellContent: lastCell?.textContent?.substring(0, 50)
      });
      
      // Try to find a container for our button using various strategies
      let buttonContainer = null;
      
      // Strategy 1: Look for data-log_main_order_id attribute
      if (lastCell) {
        buttonContainer = lastCell.querySelector('[data-log_main_order_id]');
        if (buttonContainer) {
          debugLog('processOrdersTable', 'Found button container using data-log_main_order_id');
        }
      }
      
      // Strategy 2: Look for elements that contain action buttons
      if (!buttonContainer && lastCell) {
        const actionButtons = lastCell.querySelectorAll('button');
        if (actionButtons.length > 0) {
          // Get the parent container of the last action button
          const lastButton = actionButtons[actionButtons.length - 1];
          buttonContainer = lastButton.parentElement;
          if (buttonContainer) {
            debugLog('processOrdersTable', 'Found button container using action buttons');
          }
        }
      }
      
      // Strategy 3: Look for elements with action-related class names
      if (!buttonContainer && lastCell) {
        const actionElements = lastCell.querySelectorAll('[class*="action"], [class*="btn"], [class*="button"]');
        if (actionElements.length > 0) {
          // Get the parent container of the last action element
          const lastActionElement = actionElements[actionElements.length - 1];
          buttonContainer = lastActionElement.parentElement;
          if (buttonContainer) {
            debugLog('processOrdersTable', 'Found button container using action-related class names');
          }
        }
      }
      
      // Strategy 4: Just use the last cell as container
      if (!buttonContainer && lastCell) {
        buttonContainer = lastCell;
        debugLog('processOrdersTable', 'Using last cell as button container');
      }
      
      // Add the button to the container
      if (buttonContainer) {
        buttonContainer.appendChild(button);
        debugLog('processOrdersTable', 'Added print button to container');
      } else {
        debugLog('processOrdersTable', 'Could not find a suitable container for the print button');
      }
    } else {
      debugLog('processOrdersTable', `Failed to extract order data for rows ${i} and ${i+1}`);
    }
  }
  
  // Add the "Print Multiple Orders" button if we have orders
  if (allOrders.length > 0) {
    // Check if we already added a print all button
    if (!document.getElementById('print-all-orders-button')) {
      debugLog('processOrdersTable', 'Adding Print Multiple Orders button');
      
      // Create the button
      const printAllButton = createPrintAllOrdersButton(allOrders);
      printAllButton.id = 'print-all-orders-button';
      
      // Find a good place to add the button
      const tableContainer = tbody.closest('table')?.parentElement;
      if (tableContainer) {
        // Create a container for the button
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.padding = '16px';
        buttonContainer.appendChild(printAllButton);
        
        // Insert before the table
        tableContainer.parentElement?.insertBefore(buttonContainer, tableContainer);
      } else {
        // Fallback: Add at the top of the page
        const container = document.createElement('div');
        container.style.position = 'sticky';
        container.style.top = '0';
        container.style.zIndex = '1000';
        container.style.backgroundColor = 'white';
        container.style.borderBottom = '1px solid #e5e6eb';
        container.style.padding = '8px 16px';
        container.style.display = 'flex';
        container.style.justifyContent = 'flex-end';
        container.appendChild(printAllButton);
        
        document.body.insertBefore(container, document.body.firstChild);
      }
    } else {
      // Update the existing button with the latest orders
      const existingButton = document.getElementById('print-all-orders-button');
      if (existingButton) {
        existingButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          showMultiOrderPrintDialog(allOrders);
        };
      }
    }
  }
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

// Debug function to log detailed information about the page structure
const logPageStructure = () => {
  debugLog('logPageStructure', 'Logging detailed page structure');
  
  // Log all tables on the page
  const tables = document.getElementsByTagName('table');
  debugLog('logPageStructure', `Found ${tables.length} tables on the page`);
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const tbody = table.querySelector('tbody');
    const rows = tbody ? Array.from(tbody.getElementsByTagName('tr')) : [];
    
    debugLog('logPageStructure', `Table ${i + 1}:`, {
      rowCount: rows.length,
      hasOrderIds: table.querySelectorAll('span[data-log_click_for="order_id_link"]').length > 0,
      hasDataLogMainOrderId: table.querySelectorAll('[data-log_main_order_id]').length > 0,
      hasOrderIdText: Array.from(table.querySelectorAll('td')).some(cell => cell.textContent?.includes('Order ID:'))
    });
    
    // Log sample rows if available
    if (rows.length > 0) {
      const sampleRow = rows[0];
      debugLog('logPageStructure', `Sample row from Table ${i + 1}:`, {
        cellCount: sampleRow.cells.length,
        firstCellText: sampleRow.cells[0]?.textContent?.substring(0, 50),
        hasOrderIdElement: !!sampleRow.querySelector('span[data-log_click_for="order_id_link"]'),
        hasDataLogMainOrderId: !!sampleRow.querySelector('[data-log_main_order_id]')
      });
      
      // Try to extract order data from the first two rows if available
      if (rows.length >= 2) {
        const orderRows = rows.slice(0, 2) as HTMLTableRowElement[];
        const orderData = extractOrderData(orderRows);
        debugLog('logPageStructure', `Attempted to extract order data from first two rows:`, {
          success: !!orderData,
          orderData: orderData
        });
      }
    }
  }
  
  // Log other potential order-related elements
  const orderIdElements = document.querySelectorAll('span[data-log_click_for="order_id_link"]');
  debugLog('logPageStructure', `Found ${orderIdElements.length} order ID elements on the page`);
  
  const dataLogMainOrderIdElements = document.querySelectorAll('[data-log_main_order_id]');
  debugLog('logPageStructure', `Found ${dataLogMainOrderIdElements.length} elements with data-log_main_order_id attribute`);
  
  // Log elements containing "Order ID:" text
  const elementsWithOrderIdText = Array.from(document.querySelectorAll('*'))
    .filter(el => el.textContent?.includes('Order ID:'));
  debugLog('logPageStructure', `Found ${elementsWithOrderIdText.length} elements containing "Order ID:" text`);
};

// Initialize when the page is ready
const initialize = () => {
  debugLog('initialize', 'Starting TikTok Shop content script initialization');
  debugLog('initialize', 'Current URL', window.location.href);
  
  if (window.location.href.includes('seller-us.tiktok.com/order')) {
    debugLog('initialize', 'On TikTok Shop orders page, setting up features');
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      /* Print modal styles */
      .print-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      
      .print-modal {
        background-color: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .multi-order-content {
        max-width: 800px;
      }
      
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
      }
      
      .print-button, .close-button {
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
      }
      
      .print-button {
        background-color: #fe2c55;
        color: white;
        border: none;
      }
      
      .close-button {
        background-color: #f2f3f5;
        border: 1px solid #e5e6eb;
        color: #1d2129;
      }
      
      /* Order details styling */
      .order-details {
        margin-top: 16px;
      }
      
      .order-details p {
        margin: 8px 0;
        font-size: 16px;
        line-height: 1.5;
      }
      
      .items-list {
        margin-top: 16px;
      }
      
      .items-list h3 {
        margin-top: 16px;
        margin-bottom: 8px;
        font-size: 18px;
      }
      
      .items-list ul {
        padding-left: 20px;
        margin: 0;
      }
      
      .items-list li {
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      /* Print-specific styles */
      @media print {
        @page {
          margin: 0.5cm;
          size: auto;
        }
        
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: white;
        }
        
        body * {
          visibility: hidden;
        }
        
        #print-modal-container, #multi-order-print-modal-container {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          background: none !important;
          visibility: visible !important;
          display: block !important;
          overflow: visible !important;
        }
        
        #print-modal-container *, #multi-order-print-modal-container * {
          visibility: visible;
        }
        
        .preview-only {
          display: none !important;
        }
        
        .print-only {
          display: block !important;
        }
        
        .print-modal, .multi-order-print-container {
          position: static !important;
          width: 100% !important;
          max-width: none !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
          background: white !important;
        }
        
        .order-details {
          margin-bottom: 15mm !important;
        }
        
        .items-list {
          margin-top: 5mm !important;
        }
        
        .items-list h3 {
          font-size: 14pt !important;
          margin-top: 5mm !important;
          margin-bottom: 3mm !important;
        }
        
        .page-break {
          page-break-after: always !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }
        
        h2 {
          font-size: 18pt !important;
          margin-bottom: 10mm !important;
        }
        
        p {
          font-size: 12pt !important;
          margin: 3mm 0 !important;
        }
        
        ul {
          padding-left: 5mm !important;
        }
        
        li {
          font-size: 12pt !important;
          margin-bottom: 2mm !important;
        }
      }
      
      /* Hide print-only elements when not printing */
      .print-only {
        display: none;
      }
    `;
    document.head.appendChild(style);
    
    // Log detailed page structure for debugging
    logPageStructure();
    
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
        } else {
          debugLog('initialize', 'Found table but no tbody element', {
            tableHtml: table.outerHTML.substring(0, 500) // Log a snippet of the table HTML
          });
        }
      } else {
        // Log all tables for debugging
        const allTables = document.getElementsByTagName('table');
        debugLog('initialize', 'No matching table found', {
          totalTables: allTables.length,
          tableSummary: Array.from(allTables).map(t => ({
            className: t.className,
            id: t.id,
            rowCount: t.rows.length
          }))
        });
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

// Function to show multi-order print dialog
const showMultiOrderPrintDialog = (orders: OrderData[]) => {
  debugLog('showMultiOrderPrintDialog', 'Showing multi-order print dialog', { orderCount: orders.length });
  
  // Remove any existing print modals
  document.querySelectorAll('.print-modal-overlay').forEach(modal => modal.remove());

  const modalContainer = document.createElement('div');
  modalContainer.id = 'multi-order-print-modal-container';

  const closeModal = () => {
    debugLog('showMultiOrderPrintDialog', 'Closing modal');
    modalContainer.remove();
  };

  const modal = createMultiOrderPrintDialog(orders, closeModal);
  modalContainer.appendChild(modal);
  document.body.appendChild(modalContainer);

  // Add click handler to close modal when clicking outside
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closeModal();
    }
  });
};

// Create a button to print all orders
const createPrintAllOrdersButton = (orders: OrderData[]): HTMLButtonElement => {
  debugLog('createPrintAllOrdersButton', 'Creating print all orders button', { orderCount: orders.length });
  
  const button = document.createElement('button');
  
  // Style the button to match TikTok's button style
  button.type = 'button';
  
  // Apply inline styles
  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    margin: '16px',
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#fe2c55',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  });
  
  // Add hover effect
  button.onmouseover = () => {
    button.style.backgroundColor = '#ea284f';
  };
  
  button.onmouseout = () => {
    button.style.backgroundColor = '#fe2c55';
  };
  
  // Set button text
  button.textContent = 'Print Multiple Orders';
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showMultiOrderPrintDialog(orders);
  });
  
  return button;
}; 