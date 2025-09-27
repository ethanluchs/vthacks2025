# Next.js Frontend Documentation

## Overview
This is a complete accessibility analyzer web application built with Next.js. It's designed to work with a Python backend service that handles the actual analysis. The frontend is fully independent and ready for integration.

## Application Flow

```
User Input → Next.js Frontend → Python Backend → Analysis Results → Dashboard Display
```

1. **User uploads files or enters URL** → InputForm component
2. **Frontend sends request** → `/api/analyze` Next.js API route
3. **API route forwards to Python** → Your FastAPI service at `localhost:8000`
4. **Python returns analysis** → Structured JSON response
5. **Results stored temporarily** → Browser sessionStorage
6. **User redirected to dashboard** → Visual results display

## Key Components

### 1. Input Form (`/inputform`)
- **Purpose**: File upload and URL input interface
- **Accepts**: 
  - Multiple files (HTML, CSS, JS, TS) - max 3 files
  - Optional URL for website analysis
  - Both files AND URL can be provided together
- **Validation**: File types, file count, URL format
- **Sends**: FormData with `files[]` array and/or `url` string

### 2. API Route (`/api/analyze`)
- **Purpose**: Proxy between frontend and your Python service
- **Method**: POST
- **Receives**: FormData from frontend
- **Forwards**: Exact same FormData to `http://localhost:8000/analyze`
- **Returns**: JSON response from Python service (unmodified)
- **Error Handling**: Network failures, service unavailable, malformed responses

### 3. Dashboard (`/dashboard`)
- **Purpose**: Display analysis results with visual components
- **Data Source**: Reads from browser sessionStorage
- **Processes**: Raw backend response into UI-friendly format
- **Components**: 
  - Overall accessibility score
  - ARIA issues breakdown
  - Alt text problems
  - Structure/heading issues
  - Screenshot display with issue markers
  - File list and metadata

### 4. Loading Page (`/loading`)
- **Purpose**: Shows spinner during analysis
- **Currently**: Simple loading state
- **Future**: Could show progress if Python service supports it

## Data Flow Details

### What Frontend Sends to Python
```javascript
// FormData structure sent to your Python service
const formData = new FormData();

// For file uploads
formData.append('files', file1);  // File object
formData.append('files', file2);  // File object
formData.append('files', file3);  // File object

// For URL analysis  
formData.append('url', 'https://example.com');  // String

// Both can be present in same request
```

### What Frontend Expects from Python - THIS CAN CHANGE ON MY SIDE!!
The dashboard processes your JSON response using this mapping: 

```javascript
// Your response structure → Frontend display
{
  "aria": {
    "total_elements": 50,           // → Used for score calculation
    "total_without_aria": 8,        // → "8 issues found"
    "missing_elements": [...]       // → Detailed breakdown (optional)
  },
  "altText": {
    "total_images": 12,             // → Used for score calculation  
    "images_without_alt": 3,        // → "3 issues found"
    "details": [...]                // → Detailed breakdown (optional)
  },
  "structure": {
    "total_checks": 25,             // → Used for score calculation
    "total_issues": 5,              // → "5 issues found"  
    "issues": [...]                 // → Detailed breakdown (optional)
  },
  "files": ["file1.html", "file2.css"],  // → Shows analyzed files
  "screenshots": [                 // → Visual analysis display
    {
      "url": "http://localhost:8000/screenshots/abc123.png",
      "title": "Homepage",
      "issues": [
        {
          "x": 150, "y": 200,      // → Clickable markers on image
          "type": "Missing alt text",
          "severity": "high",       // → Color coding
          "description": "..."      // → Tooltip text
        }
      ]
    }
  ]
}
```

## Score Calculation
The frontend automatically calculates accessibility scores:

```javascript
// For each category (ARIA, Alt Text, Structure)
const score = Math.round(((total - issues) / total) * 100);

// Overall score is average of all categories
const overallScore = (ariaScore + altTextScore + structureScore) / 3;
```

## Screenshot Handling
- **Requirements**: Screenshots must be served via HTTP URLs
- **Display**: Frontend shows screenshots with clickable issue markers
- **Coordinates**: Issue markers positioned using x,y coordinates relative to image
- **Multiple Screenshots**: Supports carousel view of multiple screenshots per analysis

## Environment Configuration
```bash
# .env.local (configurable)
BACKEND_SERVICE_URL=http://localhost:8000

# Can be changed to any URL where your Python service runs
```

## Error Handling
The frontend handles these error scenarios:

1. **No Backend Service**: Shows "Cannot connect to analysis service"
2. **Backend Errors**: Shows error message from your service
3. **Invalid Responses**: Shows "Failed to parse results"
4. **Network Issues**: Shows connection timeout messages
5. **No Analysis Data**: Redirects to input form with error message

## Current State
- ✅ **Production Ready**: Clean build, no TypeScript errors
- ✅ **Independent**: No dependencies on local Python scripts
- ✅ **CORS Enabled**: Ready to communicate with your service
- ✅ **Type Safe**: All responses validated against TypeScript interfaces
- ✅ **Error Resilient**: Handles all failure scenarios gracefully

## Integration Requirements

### What You Need to Provide
1. **FastAPI server** running on `localhost:8000` (configurable)
2. **POST endpoint** at `/analyze` accepting multipart/form-data
3. **JSON response** matching the structure shown above
4. **HTTP-accessible screenshots** (if doing visual analysis)
5. **CORS headers** allowing requests from `localhost:3001`

### What Frontend Provides
1. **Clean file uploads** with proper validation
2. **URL input** for website analysis
3. **Automatic error handling** for service issues
4. **Visual dashboard** for displaying results
5. **Score calculations** and progress indicators

## Testing the Integration

### 1. Start Both Services
```bash
# Start your Python service
uvicorn main:app --host 0.0.0.0 --port 8000

# Start Next.js frontend  
cd web && npm run dev
```

### 2. Test the Flow
1. Visit `http://localhost:3001/inputform`
2. Upload files or enter URL
3. Submit form → Should call your Python service
4. Get redirected to dashboard → Should show your analysis results

### 3. Debug Issues
- Check browser Network tab for API calls
- Check Python service logs for incoming requests
- Check console for JavaScript errors
- Verify JSON response format matches expected structure

## File Structure
```
web/
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts     # Forwards to your Python service
│   │   ├── dashboard/page.tsx       # Results display
│   │   ├── inputform/InputForm.tsx  # File/URL input
│   │   └── loading/page.tsx         # Loading states
│   ├── components/dashboard/        # UI components for results
│   └── lib/types.ts                 # TypeScript interfaces
├── .env.local                       # Backend URL configuration
└── package.json                     # Dependencies
```
