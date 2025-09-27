'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OverallScore from '@/components/dashboard/OverallScore';
import MetricsPanel from '@/components/dashboard/MetricsPanel';
import FilesAnalyzed from '@/components/dashboard/FilesAnalyzed';
import VisualAnalysis from '@/components/dashboard/VisualAnalysis';
import { BackendAnalysisResponse } from '@/lib/types';

interface Screenshot {
  url: string;
  title: string;
  issues: Array<{ x: number; y: number; type: string }>;
}

interface AnalysisResults {
  overallScore: number;
  aria: { score: number; issues: number; details?: Array<Record<string, unknown>> };
  altText: { score: number; issues: number; details?: Array<Record<string, unknown>> };
  structure: { score: number; issues: number; details?: Array<Record<string, unknown>> };
  files: string[];
  screenshots: Screenshot[];
}

export default function Dashboard() {
  const [analysisData, setAnalysisData] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();



  useEffect(() => {
    // Get analysis results from sessionStorage
    const storedResults = sessionStorage.getItem('analysisResults');
    
    if (!storedResults) {
      setError('Please upload files first to see the analysis dashboard');
      setLoading(false);
      return;
    }

    try {
      const results = JSON.parse(storedResults);
      setAnalysisData(processAnalysisResults(results));
    } catch (error) {
      console.error('Error parsing analysis results:', error);
      setError('There was an error loading the analysis results');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const processAnalysisResults = (rawResults: BackendAnalysisResponse): AnalysisResults => {
    // Process the raw backend analysis output into dashboard format
    
    // Calculate scores based on issues found
    const calculateScore = (issues: number, total: number) => {
      if (total === 0) return 100;
      return Math.max(0, Math.round(((total - issues) / total) * 100));
    };

    // Extract data from backend analysis
    const ariaIssues = rawResults.aria?.total_without_aria || 0;
    const ariaTotal = rawResults.aria?.total_elements || 1;
    
    const altTextIssues = rawResults.altText?.images_without_alt || 0;
    const altTextTotal = rawResults.altText?.total_images || 1;
    
    const structureIssues = rawResults.structure?.total_issues || 0;
    const structureTotal = rawResults.structure?.total_checks || 1;

    const aria = {
      score: calculateScore(ariaIssues, ariaTotal),
      issues: ariaIssues,
      details: rawResults.aria?.missing_elements || []
    };

    const altText = {
      score: calculateScore(altTextIssues, altTextTotal),
      issues: altTextIssues,
      details: rawResults.altText?.details || []
    };

    const structure = {
      score: calculateScore(structureIssues, structureTotal),
      issues: structureIssues,
      details: rawResults.structure?.issues || []
    };

    // Calculate overall score
    const overallScore = Math.round((aria.score + altText.score + structure.score) / 3);

    // Handle both single screenshot (legacy) and multiple screenshots
    let screenshots: Screenshot[] = [];
    
    if (rawResults.screenshots && Array.isArray(rawResults.screenshots)) {
      // New format with multiple screenshots
      screenshots = rawResults.screenshots;
    } else {
      // Fallback placeholder when no screenshots available
      screenshots = [{
        url: '/tarey.jpeg',
        title: 'Main Page',
        issues: [
          { x: 120, y: 200, type: 'Missing ARIA label' },
          { x: 300, y: 450, type: 'No alt text' },
          { x: 800, y: 150, type: 'Poor contrast' }
        ]
      }];
    }

    return {
      overallScore,
      aria,
      altText,
      structure,
      files: rawResults.files || ['Unknown files'],
      screenshots
    };
  };

  const handleNewAnalysis = () => {
    // Clear stored results and go back to upload
    sessionStorage.removeItem('analysisResults');
    router.push('/inputform');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">No analysis data found</p>
          <button 
            onClick={handleNewAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  const totalIssues = analysisData.aria.issues + analysisData.altText.issues + analysisData.structure.issues;
  const completedAt = new Date();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 mb-4 max-w-md text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => router.push('/inputform')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Go to Upload Page
            </button>
          </div>
        </div>
      ) : analysisData && (
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <DashboardHeader 
              filesCount={analysisData.files.length}
              issuesCount={totalIssues}
              completedAt={completedAt}
            />
            <button
              onClick={handleNewAnalysis}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              New Analysis
            </button>
          </div>

          {/* Grid layout */}
          <div className="grid grid-cols-5 gap-6 h-[75vh]">
            {/* Left Column - Metrics */}
            <div className="col-span-1 space-y-4">
              <OverallScore score={analysisData.overallScore} />
              
              <MetricsPanel 
                aria={analysisData.aria}
                altText={analysisData.altText}
                structure={analysisData.structure}
              />

              <FilesAnalyzed files={analysisData.files} />
            </div>

            {/* Main Screenshot Area */}
            <div className="col-span-4">
              <VisualAnalysis screenshots={analysisData.screenshots} />
            </div>
          </div>

          {/* Debug info (remove for production) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 p-4 bg-zinc-900 rounded-lg">
              <summary className="text-sm text-zinc-400 cursor-pointer">Debug: Raw Analysis Data</summary>
              <pre className="mt-2 text-xs text-zinc-500 overflow-auto">
                {JSON.stringify(analysisData, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}