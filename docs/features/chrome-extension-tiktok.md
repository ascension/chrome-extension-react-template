# TikTok Shop Print Bag Label Feature Requirements

## Overview
Add a "Print Bag Label" button to each order on the TikTok Shop pending orders page that allows users to quickly print shipping labels with relevant order information.

## Target Page
- URL: https://seller-us.tiktok.com/order?selected_sort=6&tab=pending
- Page Section: Orders table, specifically targeting each order group (set of 3 `<tr>` tags)

## Feature Components

### 1. UI Modifications
- Add a "Print Bag Label" button next to each order in the first `<tr>` of each order group
- Button styling should match TikTok Shop's design system
- Button placement should be consistent and visible for each order

### 2. Data Extraction
For each order, extract the following information:
1. Order Number
   - Source: `data-log_main_order_id` attribute
   - Format: Display first 4 digits + redacted middle + last 6 digits
   - Example: If order number is "123456789012", display as "1234****789012"
2. Username
   - Location: First `<tr>` of order group
3. Order Date
   - Location: First `<tr>` of order group
4. Order Items
   - Location: Second `<tr>` of order group
   - Include: Item names, quantities, and any relevant SKU information

### 3. Modal Component
When "Print Bag Label" is clicked:
- Display a modal dialog containing:
  1. Formatted order number (with redaction)
  2. Customer username
  3. Order date
  4. List of items in the order
  5. "Print" button
  6. "Close" button
- Modal should be centered on screen
- Modal should have a clean, professional layout
- Background should be dimmed when modal is open

### 4. Print Functionality
- When print button is clicked:
  1. Format the data in a clean, organized layout suitable for a shipping label
  2. Trigger browser print dialog
  3. Close modal after successful print

## Technical Implementation Notes
1. Content Script Integration
   - Inject the button elements after the page loads
   - Use MutationObserver to handle dynamic page updates
   - Ensure buttons are added to new orders when page is sorted or filtered

2. Event Handling
   - Handle button click events
   - Manage modal open/close states
   - Handle print events

3. Data Processing
   - Implement order number redaction logic
   - Parse and format dates consistently
   - Handle potential missing data gracefully

4. Error Handling
   - Display user-friendly error messages if data extraction fails
   - Provide fallback options if printing fails
   - Handle cases where page structure changes

## Security Considerations
- Ensure no sensitive customer data is stored
- Validate all data before displaying
- Follow TikTok's terms of service regarding data usage

## Testing Requirements
1. Verify button appears correctly for all orders
2. Confirm data extraction is accurate
3. Test order number redaction
4. Verify modal displays correctly
5. Test print functionality
6. Verify handling of edge cases (missing data, long usernames, multiple items)
7. Test across different Chrome versions
