// Backend API Response Types
export interface BackendAnalysisResponse {
  files: string[];
  url?: string;
  aria: {
    total_elements: number;
    total_without_aria: number;
    missing_elements: Array<{
      element: string;
      location: string;
      suggestion: string;
    }>;
  };
  altText: {
    total_images: number;
    images_without_alt: number;
    details: Array<{
      src: string;
      location: string;
      suggestion: string;
    }>;
  };
  structure: {
    total_checks: number;
    total_issues: number;
    issues: Array<{
      type: string;
      element: string;
      location: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };
  screenshots?: Array<{
    url: string;
    title: string;
    timestamp: string;
    issues: Array<{
      x: number;
      y: number;
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }>;
  rawOutput?: string;
  timestamp: string;
  metadata?: {
    analysisTime: number;
    toolsUsed: string[];
    version: string;
  };
}

// Frontend Dashboard Types
export interface Screenshot {
  url: string;
  title: string;
  issues: Array<{ x: number; y: number; type: string }>; //add array of images
}

export interface ProcessedAnalysisResults {
  overallScore: number;
  aria: { score: number; issues: number; details?: Array<Record<string, unknown>> };
  altText: { score: number; issues: number; details?: Array<Record<string, unknown>> };
  structure: { score: number; issues: number; details?: Array<Record<string, unknown>> };
  files: string[];
  screenshots: Screenshot[];
  timestamp?: string;
  metadata?: {
    analysisTime: number;
    toolsUsed: string[];
  };
}

// Form Data Types
export interface AnalysisRequest {
  files?: File[];
  url?: string;
}

// Error Types
export interface ApiError {
  error: string;
  details?: string;
  timestamp: string;
}
