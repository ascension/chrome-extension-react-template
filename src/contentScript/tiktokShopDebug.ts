// Debug script to help identify why the TikTok Shop content script isn't working
console.log('TikTok Shop Debug Script Loaded');

// Define a type for the debug panel
interface DebugPanel {
  log: (message: string) => void;
  updateStatus: (message: string, isError?: boolean) => void;
}

// Function to create a debug panel on the page
const createDebugPanel = (): DebugPanel => {
  // Create container
  const container = document.createElement('div');
  container.id = 'hive-debug-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #333;
    max-width: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 10px 15px;
    background: #4CAF50;
    color: white;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  `;
  header.innerHTML = '<span>🐝 Hive Extension Debug</span><span id="hive-debug-toggle">▼</span>';
  
  // Create content area
  const content = document.createElement('div');
  content.id = 'hive-debug-content';
  content.style.cssText = `
    padding: 15px;
    max-height: 400px;
    overflow-y: auto;
    display: none;
  `;

  // Create status indicator
  const status = document.createElement('div');
  status.id = 'hive-debug-status';
  status.style.cssText = `
    padding: 10px 15px;
    background: #f8f8f8;
    border-top: 1px solid #eee;
    font-weight: bold;
  `;
  status.textContent = 'Extension loaded and running';

  // Create debug log area
  const logArea = document.createElement('pre');
  logArea.id = 'hive-debug-log';
  logArea.style.cssText = `
    background: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 10px;
  `;

  // Create copy button
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy Debug Info';
  copyButton.style.cssText = `
    margin-top: 10px;
    padding: 8px 12px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  copyButton.onclick = () => {
    const debugText = logArea.textContent || '';
    navigator.clipboard.writeText(debugText).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy Debug Info';
      }, 2000);
    });
  };

  // Assemble the panel
  content.appendChild(logArea);
  content.appendChild(copyButton);
  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(status);
  document.body.appendChild(container);

  // Toggle functionality
  header.addEventListener('click', () => {
    const isVisible = content.style.display === 'block';
    content.style.display = isVisible ? 'none' : 'block';
    document.getElementById('hive-debug-toggle')!.textContent = isVisible ? '▼' : '▲';
  });

  return {
    log: (message: string) => {
      const logElement = document.getElementById('hive-debug-log');
      if (logElement) {
        logElement.textContent = logElement.textContent + '\n' + message;
        // Auto-scroll to bottom
        logElement.scrollTop = logElement.scrollHeight;
      }
      console.log(message);
    },
    updateStatus: (message: string, isError = false) => {
      const statusElement = document.getElementById('hive-debug-status');
      if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.background = isError ? '#ffebee' : '#f8f8f8';
        statusElement.style.color = isError ? '#d32f2f' : '#333';
      }
    }
  };
};

// Function to log page structure information
const logPageStructure = (debugPanel: DebugPanel) => {
  debugPanel.log('=== TikTok Shop Debug Info ===');
  debugPanel.log(`Timestamp: ${new Date().toISOString()}`);
  debugPanel.log(`Current URL: ${window.location.href}`);
  
  // Check for tables
  const tables = document.getElementsByTagName('table');
  debugPanel.log(`Tables found: ${tables.length}`);
  
  // Log table class names
  Array.from(tables).forEach((table, index) => {
    debugPanel.log(`Table ${index} class: ${table.className}`);
    debugPanel.log(`Table ${index} rows: ${table.rows.length}`);
  });
  
  // Try to find the orders table using the current regex
  const tableRegex = /\blistTableContainer-?[a-zA-Z0-9]*\b/;
  const matchingTables = Array.from(tables).filter(table => tableRegex.test(table.className));
  debugPanel.log(`Tables matching regex: ${matchingTables.length}`);
  
  // Check for potential order rows
  const rows = document.querySelectorAll('tr');
  debugPanel.log(`Total TR elements: ${rows.length}`);
  
  // Check for specific selectors used in the script
  const selectors = [
    '.order_id_number',
    '.line-clamp-2.w-full.whitespace-normal.text-p4-regular.break-word',
    '.sc-hkwnrn.fLiXBY',
    '.sc-bsipQr.ldUoNQ',
    '.sc-bsipQr.ijbzcX',
    'td[width="170"]',
    '[data-log_main_order_id]',
    '.sc-bsipQr.gtPBuy'
  ];
  
  debugPanel.log('\n=== Selector Matches ===');
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    debugPanel.log(`Elements matching "${selector}": ${elements.length}`);
  });
  
  // Try to find alternative selectors that might be used now
  debugPanel.log('\n=== Alternative Selectors ===');
  
  // Look for order ID elements
  const possibleOrderIdElements = document.querySelectorAll('[class*="order_id"], [class*="orderId"], [id*="order_id"], [id*="orderId"]');
  debugPanel.log(`Possible order ID elements: ${possibleOrderIdElements.length}`);
  if (possibleOrderIdElements.length > 0) {
    debugPanel.log('Sample order ID element classes:');
    Array.from(possibleOrderIdElements).slice(0, 3).forEach((el: Element, i) => {
      debugPanel.log(`  ${i}: ${(el as HTMLElement).className}`);
    });
  }
  
  // Look for table containers
  const possibleTableContainers = document.querySelectorAll('[class*="table"], [class*="Table"], [id*="table"], [id*="Table"]');
  debugPanel.log(`Possible table containers: ${possibleTableContainers.length}`);
  if (possibleTableContainers.length > 0) {
    debugPanel.log('Sample table container classes:');
    Array.from(possibleTableContainers).slice(0, 3).forEach((el: Element, i) => {
      debugPanel.log(`  ${i}: ${(el as HTMLElement).className}`);
    });
  }
  
  // Look for action buttons
  const possibleActionButtons = document.querySelectorAll('button, [role="button"]');
  debugPanel.log(`Possible action buttons: ${possibleActionButtons.length}`);
  
  // Look for potential new table patterns
  debugPanel.log('\n=== Potential New Table Patterns ===');
  if (tables.length > 0) {
    debugPanel.log('All table classes:');
    Array.from(tables).forEach((table, i) => {
      debugPanel.log(`  Table ${i}: ${table.className || '(no class)'} - Rows: ${table.rows.length}`);
    });
    
    // Try to identify the orders table based on content
    debugPanel.log('\nAttempting to identify orders table by content:');
    let potentialOrdersTable: HTMLTableElement | null = null;
    let potentialOrdersTableScore = 0;
    
    Array.from(tables).forEach((table, i) => {
      let score = 0;
      const text = table.textContent || '';
      
      // Check for order-related keywords
      if (text.includes('Order')) score += 5;
      if (text.includes('ID')) score += 3;
      if (text.includes('Date')) score += 2;
      if (text.includes('Customer')) score += 2;
      if (text.includes('Status')) score += 2;
      if (text.includes('Total')) score += 2;
      if (text.includes('Action')) score += 3;
      
      // Check for multiple rows (likely an orders table)
      if (table.rows.length > 5) score += 5;
      
      if (score > potentialOrdersTableScore) {
        potentialOrdersTableScore = score;
        potentialOrdersTable = table;
      }
      
      debugPanel.log(`  Table ${i} score: ${score}`);
    });
    
    if (potentialOrdersTable !== null) {
      const table = potentialOrdersTable as HTMLTableElement;
      debugPanel.log(`\nMost likely orders table: Score ${potentialOrdersTableScore}`);
      debugPanel.log(`Class: ${table.className || '(no class)'}`);
      debugPanel.log(`Rows: ${table.rows.length}`);
      
      // Analyze the structure of the potential orders table
      if (table.rows.length > 0) {
        const firstRow = table.rows[0];
        debugPanel.log(`First row cells: ${firstRow.cells.length}`);
        
        // Try to identify column headers or first row content
        Array.from(firstRow.cells).forEach((cell, i) => {
          const cellElement = cell as HTMLTableCellElement;
          debugPanel.log(`  Cell ${i}: ${cellElement.textContent?.trim().substring(0, 30) || '(empty)'}`);
        });
        
        // If there are more rows, check the second row too
        if (table.rows.length > 1) {
          const secondRow = table.rows[1];
          debugPanel.log(`Second row cells: ${secondRow.cells.length}`);
          
          // Look for potential order ID in the second row
          Array.from(secondRow.cells).forEach((cell, i) => {
            const cellElement = cell as HTMLTableCellElement;
            const text = cellElement.textContent?.trim() || '';
            if (text.match(/\d{6,}/)) {
              debugPanel.log(`  Potential order ID in cell ${i}: ${text.substring(0, 30)}`);
            }
          });
        }
      }
    }
  }
  
  // Check for potential new action containers
  debugPanel.log('\n=== Potential Action Containers ===');
  const actionContainers = document.querySelectorAll('[class*="action"], [id*="action"], [class*="button"], [id*="button"]');
  debugPanel.log(`Potential action containers: ${actionContainers.length}`);
  if (actionContainers.length > 0) {
    debugPanel.log('Sample action container classes:');
    Array.from(actionContainers).slice(0, 5).forEach((el: Element, i) => {
      debugPanel.log(`  ${i}: ${(el as HTMLElement).className || '(no class)'}`);
    });
  }
  
  // Document structure summary
  debugPanel.log('\n=== Document Structure ===');
  debugPanel.log(`Body children: ${document.body.children.length}`);
  debugPanel.log(`Main content area: ${document.querySelector('main') ? 'Found' : 'Not found'}`);
  
  // Check for any React or Vue related attributes
  const reactElements = document.querySelectorAll('[data-reactroot], [data-reactid]');
  debugPanel.log(`React elements: ${reactElements.length}`);
  
  const vueElements = document.querySelectorAll('[data-v-]');
  debugPanel.log(`Vue elements: ${vueElements.length}`);
  
  // Check for iframe content
  const iframes = document.querySelectorAll('iframe');
  debugPanel.log(`Iframes: ${iframes.length}`);
  
  debugPanel.log('\n=== End of Debug Info ===');
};

// Function to analyze findings and suggest fixes
const analyzeFindingsAndSuggestFixes = (debugPanel: DebugPanel) => {
  debugPanel.log('\n=== Analysis and Suggestions ===');
  
  // Check if we found any tables
  const tables = document.getElementsByTagName('table');
  if (tables.length === 0) {
    debugPanel.log('Issue: No tables found on the page.');
    debugPanel.log('Suggestion: TikTok Shop may have changed their UI to not use tables. The extension needs to be updated to target the new UI structure.');
    return;
  }
  
  // Check if we found any tables matching the current regex
  const tableRegex = /\blistTableContainer-?[a-zA-Z0-9]*\b/;
  const matchingTables = Array.from(tables).filter(table => tableRegex.test(table.className));
  if (matchingTables.length === 0) {
    debugPanel.log('Issue: No tables match the current regex pattern.');
    
    // Try to find a potential new table class pattern
    const tableClasses = Array.from(tables).map(t => t.className).filter(Boolean);
    if (tableClasses.length > 0) {
      debugPanel.log('Potential new table classes:');
      tableClasses.forEach(className => {
        debugPanel.log(`  ${className}`);
      });
      
      // Look for common patterns in table classes
      const commonPatterns = [
        'table', 'Table', 'grid', 'Grid', 'list', 'List', 'order'
      ];
      
      const potentialNewPatterns = commonPatterns.filter(pattern => 
        tableClasses.some(className => className.includes(pattern))
      );
      
      if (potentialNewPatterns.length > 0) {
        debugPanel.log('\nSuggestion: Update the table regex pattern to match one of these classes:');
        potentialNewPatterns.forEach(pattern => {
          const matchingClass = tableClasses.find(className => className.includes(pattern));
          if (matchingClass) {
            debugPanel.log(`  Pattern: ${pattern}, Example class: ${matchingClass}`);
            debugPanel.log(`  New regex: /\\b${pattern}-?[a-zA-Z0-9]*\\b/`);
          }
        });
      }
    }
  }
  
  // Check for order ID elements
  const orderIdElements = document.querySelectorAll('.order_id_number');
  if (orderIdElements.length === 0) {
    debugPanel.log('\nIssue: No elements match the current order ID selector (.order_id_number).');
    
    // Look for potential order ID elements
    const potentialOrderIdElements = document.querySelectorAll('[class*="order"][class*="id"], [class*="orderId"], [id*="order_id"], [id*="orderId"]');
    if (potentialOrderIdElements.length > 0) {
      debugPanel.log('Potential new order ID selectors:');
      Array.from(potentialOrderIdElements).slice(0, 3).forEach((el: Element) => {
        debugPanel.log(`  Class: ${(el as HTMLElement).className}, Text: ${(el as HTMLElement).textContent?.trim().substring(0, 30)}`);
      });
    }
    
    // Look for elements containing numeric patterns that might be order IDs
    const potentialNumericIds = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent?.trim() || '';
      return text.match(/^\d{6,}$/) || text.match(/^#\d{6,}$/);
    });
    
    if (potentialNumericIds.length > 0) {
      debugPanel.log('\nElements with potential order ID patterns:');
      potentialNumericIds.slice(0, 3).forEach((el: Element, i) => {
        debugPanel.log(`  ${i}: Class: ${(el as HTMLElement).className}, Text: ${(el as HTMLElement).textContent?.trim()}`);
      });
    }
  }
  
  // Check for action containers
  const actionContainers = document.querySelectorAll('[data-log_main_order_id] .sc-bsipQr.gtPBuy');
  if (actionContainers.length === 0) {
    debugPanel.log('\nIssue: No elements match the current action container selector.');
    
    // Look for potential action containers
    const potentialActionContainers = document.querySelectorAll('[class*="action"], [class*="Action"], [id*="action"], [id*="Action"]');
    if (potentialActionContainers.length > 0) {
      debugPanel.log('Potential new action container selectors:');
      Array.from(potentialActionContainers).slice(0, 3).forEach((el: Element) => {
        debugPanel.log(`  Class: ${(el as HTMLElement).className}`);
      });
    }
  }
  
  // Summary of findings
  debugPanel.log('\nSummary of findings:');
  debugPanel.log(`- Tables found: ${tables.length}`);
  debugPanel.log(`- Tables matching current regex: ${matchingTables.length}`);
  debugPanel.log(`- Order ID elements found: ${orderIdElements.length}`);
  debugPanel.log(`- Action containers found: ${actionContainers.length}`);
  
  // Overall recommendation
  debugPanel.log('\nOverall recommendation:');
  if (matchingTables.length === 0) {
    debugPanel.log('The table selector needs to be updated. TikTok Shop has likely changed their table class names.');
  } else if (orderIdElements.length === 0) {
    debugPanel.log('The order ID selector needs to be updated. TikTok Shop has likely changed their element class names.');
  } else if (actionContainers.length === 0) {
    debugPanel.log('The action container selector needs to be updated. TikTok Shop has likely changed their element class names.');
  } else {
    debugPanel.log('All selectors appear to be present, but the extension is still not working. There might be other issues with the page structure or event handling.');
  }
};

// Initialize when the page is ready
const initialize = () => {
  console.log('TikTok Shop Debug: Initializing');
  
  if (window.location.href.includes('seller-us.tiktok.com/order')) {
    console.log('TikTok Shop Debug: On orders page');
    
    // Create debug panel after a short delay to ensure the page is loaded
    setTimeout(() => {
      const debugPanel = createDebugPanel();
      debugPanel.updateStatus('Extension loaded and analyzing page...');
      
      // Log structure immediately
      logPageStructure(debugPanel);
      
      // And also after a delay to catch any dynamic content
      setTimeout(() => {
        debugPanel.log('\n=== After Delay (3s) ===');
        logPageStructure(debugPanel);
        
        // Analyze findings and suggest fixes
        analyzeFindingsAndSuggestFixes(debugPanel);
        
        // Update status based on findings
        const tableRegex = /\blistTableContainer-?[a-zA-Z0-9]*\b/;
        const tables = document.getElementsByTagName('table');
        const matchingTables = Array.from(tables).filter(table => tableRegex.test(table.className));
        
        if (matchingTables.length === 0) {
          debugPanel.updateStatus('Issue detected: No matching tables found', true);
        } else {
          const orderIdElements = document.querySelectorAll('.order_id_number');
          if (orderIdElements.length === 0) {
            debugPanel.updateStatus('Issue detected: Table found but no order IDs', true);
          } else {
            debugPanel.updateStatus('Page structure looks correct, but extension features not working');
          }
        }
      }, 3000);
    }, 1000);
  } else {
    console.log('TikTok Shop Debug: Not on orders page');
  }
};

// Start the initialization
if (document.readyState === 'loading') {
  console.log('TikTok Shop Debug: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  console.log('TikTok Shop Debug: Document already loaded, initializing immediately');
  initialize();
} 