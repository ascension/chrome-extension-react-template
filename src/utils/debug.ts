// Debug logging function
export const debugLog = async (source: string, message: string, data?: unknown) => {
  // Check if debug mode is enabled
  const { debugEnabled } = await chrome.storage.local.get('debugEnabled');
  if (!debugEnabled && process.env.NODE_ENV !== 'development') {
    return;
  }

  // Log to console with special prefix for content script
  console.log(`[Print Hive] ${source}:`, message, data || '');
  
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

  // Add visual debug element if in development or debug mode is enabled
  if (process.env.NODE_ENV === 'development' || debugEnabled) {
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