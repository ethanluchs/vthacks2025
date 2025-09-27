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

  const processAnalysisResults = (rawResults: any): AnalysisResults => {
    // Process the raw backend analysis output into dashboard format
    console.log('Raw results received:', rawResults);
    
    // Calculate scores based on issues found
    const calculateScore = (issues: number, total: number) => {
      if (total === 0) return 100;
      return Math.max(0, Math.round(((total - issues) / total) * 100));
    };

    // Handle both combined results and single analysis type
    const urlAnalysis = rawResults.data?.url_analysis || null;
    const fileAnalysis = rawResults.data?.file_analysis || rawResults.data; // fallback for backwards compatibility

    // Extract data from file analysis (code_analyzer results)
    let ariaIssues = 0;
    let ariaTotal = 1;
    let ariaDetails: any[] = [];

    if (fileAnalysis?.aria_analysis && !fileAnalysis.aria_analysis.error) {
      ariaIssues = fileAnalysis.aria_analysis.summary?.total_elements_without_aria || 0;
      ariaTotal = fileAnalysis.aria_analysis.summary?.total_interactive_elements || 1;
      ariaDetails = fileAnalysis.aria_analysis.missing_aria_elements || [];
    }

    let altTextIssues = 0;
    let altTextTotal = 1;
    let altTextDetails: any[] = [];

    if (fileAnalysis?.alt_tag_analysis) {
      altTextIssues = fileAnalysis.alt_tag_analysis.summary?.images_without_alt || 0;
      altTextTotal = fileAnalysis.alt_tag_analysis.summary?.total_images || 1;
      altTextDetails = fileAnalysis.alt_tag_analysis.all_missing_tags || [];
    }

    let structureIssues = 0;
    let structureTotal = 1;
    let structureDetails: any[] = [];

    if (fileAnalysis?.nesting_analysis) {
      structureIssues = fileAnalysis.nesting_analysis.summary?.total_issues_found || 0;
      structureTotal = fileAnalysis.nesting_analysis.summary?.total_files_analyzed || 1;
      structureDetails = fileAnalysis.nesting_analysis.issues || [];
    }

    const aria = {
      score: calculateScore(ariaIssues, ariaTotal),
      issues: ariaIssues,
      details: ariaDetails
    };

    const altText = {
      score: calculateScore(altTextIssues, altTextTotal),
      issues: altTextIssues,
      details: altTextDetails
    };

    const structure = {
      score: calculateScore(structureIssues, structureTotal),
      issues: structureIssues,
      details: structureDetails
    };

    // Calculate overall score
    const overallScore = Math.round((aria.score + altText.score + structure.score) / 3);

    // Extract file names from analysis
    let files: string[] = [];
    if (fileAnalysis?.nesting_analysis?.files) {
      files = fileAnalysis.nesting_analysis.files.map((f: any) => f.filename);
    } else if (fileAnalysis?.aria_analysis?.files) {
      files = fileAnalysis.aria_analysis.files.map((f: any) => f.filename);
    }
    
    // Add URL to files list if we have URL analysis
    if (urlAnalysis && rawResults.data?.url_analysis) {
      const urlString = typeof rawResults.data.url_analysis === 'object' ? 'Website Analysis' : rawResults.data.url_analysis;
      files.unshift(urlString);
    }
    
    // Fallback if no files found
    if (files.length === 0) {
      files = ['Unknown files'];
    }

    // Handle screenshots - prioritize URL analysis screenshots, fallback to placeholder
    let screenshots: Screenshot[] = [];
    
    if (urlAnalysis?.screenshots && Array.isArray(urlAnalysis.screenshots)) {
      screenshots = urlAnalysis.screenshots;
    } else {
      // Fallback placeholder
      screenshots = [{
        url: '/tarey.jpeg',
        title: fileAnalysis ? 'Code Analysis Results' : 'Analysis Results',
        issues: [
          { x: 120, y: 200, type: 'Missing ARIA label' },
          { x: 300, y: 450, type: 'No alt text' },
          { x: 800, y: 150, type: 'Nesting issues' }
        ]
      }];
    }

    const result = {
      overallScore,
      aria,
      altText,
      structure,
      files,
      screenshots
    };

    console.log('Processed analysis results:', result);
    return result;
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