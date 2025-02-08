# Chrome Extension Enhancement: Thangs.com and Patreon.com Integration

## Overview
This document outlines the requirements and specifications for extending the Print Hive Chrome extension to support model extraction from Thangs.com and Patreon.com. This enhancement aims to streamline the process of adding 3D models to Print Hive directly from these platforms.

## Goals
- Enable users to easily import 3D model information from Thangs.com and Patreon.com
- Provide a seamless integration with Print Hive's model management system
- Replace existing Supabase implementation with new @hiv3d/api endpoints

## Feature Requirements

### 1. Thangs.com Integration

#### Page Detection
- **Requirement**: Extension must detect when user is on a Thangs.com model page
- **Implementation**: Monitor URL patterns matching Thangs.com model pages
- **Example URL Pattern**: `https://thangs.com/*/model/*`

#### Data Extraction
- **Required Fields**:
  - Title of the model
  - Designer name/username
  - Thumbnail photos
  - Model URL (for reference)

#### User Interface
- Add "Save to Print Hive" button when model page is detected
- Show preview of extracted data before saving
- Provide success/error feedback

### 2. Patreon.com Integration

#### Page Detection
- **Requirement**: Extension must detect when user is on a Patreon post page
- **Implementation**: Monitor URL patterns matching Patreon.com post pages
- **Example URL Pattern**: `https://www.patreon.com/posts/*`

#### Data Extraction
- **Required Fields**:
  - Post title
  - Creator name
  - Photos from the post
  - Post URL (for reference)

#### User Interface
- Add "Save to Print Hive" button when post page is detected
- Show preview of extracted data before saving
- Provide success/error feedback

## Technical Specifications

### API Endpoints
New endpoints needed in @hiv3d/api:

1. **Model Creation Endpoint**
```typescript
POST /api/v1/models/external
Request Body: {
  source: 'thangs' | 'patreon',
  title: string,
  designer: string,
  thumbnails: string[],
  sourceUrl: string,
  sourceId: string,
}
Response: {
  id: string,
  status: 'success' | 'error',
  message?: string
}
```

2. **Thumbnail Upload Endpoint**
```typescript
POST /api/v1/models/:modelId/thumbnails
Request Body: FormData (images)
Response: {
  urls: string[],
  status: 'success' | 'error'
}
```

### Chrome Extension Updates

#### Content Scripts
- Add new content scripts for Thangs.com and Patreon.com
- Implement page detection logic
- Add DOM parsing for data extraction
- Handle image extraction and processing

#### Background Script
- Handle communication between content scripts and Print Hive API
- Manage authentication state
- Handle image upload processing

#### Permissions Required
```json
{
  "permissions": [
    "*://*.thangs.com/*",
    "*://*.patreon.com/*",
    "storage",
    "activeTab"
  ]
}
```

## Implementation Phases

### Phase 1: Infrastructure
1. Create new API endpoints in @hiv3d/api
2. Update extension manifest for new permissions
3. Set up basic content script structure

### Phase 2: Thangs.com Integration
1. Implement Thangs.com page detection
2. Develop data extraction logic
3. Create UI components
4. Test and refine

### Phase 3: Patreon.com Integration
1. Implement Patreon.com page detection
2. Develop data extraction logic
3. Create UI components
4. Test and refine

### Phase 4: Testing & Deployment
1. End-to-end testing
2. Security review
3. Performance optimization
4. Documentation update
5. Chrome Web Store submission

## Success Metrics
- Successful extraction rate > 95%
- User adoption rate
- Error rate < 5%
- Average time to save a model < 30 seconds

## Dependencies
- @hiv3d/api updates
- Chrome Extension manifest v3 compatibility
- Image processing capabilities
- Authentication system integration

## Security Considerations
- Secure handling of API keys
- CORS policy updates
- Rate limiting implementation
- User authentication validation
- Safe image handling and validation

## Future Considerations
- Support for additional 3D model platforms
- Batch model import functionality
- Offline capability
- Integration with other browsers (Firefox, Safari) 