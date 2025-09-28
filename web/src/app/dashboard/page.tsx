'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OverallScore from '@/components/dashboard/OverallScore';
import MetricsPanel from '@/components/dashboard/MetricsPanel';
import FilesAnalyzed from '@/components/dashboard/FilesAnalyzed';
import VisualAnalysis from '@/components/dashboard/VisualAnalysis';
import ARIASection from '@/components/dashboard/ARIASection';
import AltTextSection from '@/components/dashboard/AltTextSection';
import StructureSection from '@/components/dashboard/StructureSection';
import { BackendAnalysisResponse } from '@/lib/types';
import PageTransition from '@/components/PageTransition';
import Silk from '@/components/Silk';
import AIFix from '@/components/dashboard/AIFix';

interface Screenshot {
  url: string;
  title: string;
  issues: Array<{ x: number; y: number; type: string; w?: number; h?: number; ratio?: number }>;
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
      setError('There was an error loading the analysis results');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const processAnalysisResults = (rawResults: any): AnalysisResults => {
    // Process the raw backend analysis output into dashboard format
    
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
      
      // Alt-text has different structure - extract tags from each file
      altTextDetails = [];
      if (fileAnalysis.alt_tag_analysis.all_missing_tags) {
        fileAnalysis.alt_tag_analysis.all_missing_tags.forEach((fileData: any) => {
          if (fileData.tags && Array.isArray(fileData.tags)) {
            fileData.tags.forEach((tag: any) => {
              // The tag is a string, not an object!
              const tagString = typeof tag === 'string' ? tag : (tag.tag_html || tag.html || tag.tag || 'No HTML available');
              
              altTextDetails.push({
                tag_html: tagString,
                suggestion: typeof tag === 'object' ? (tag.suggestion || tag.alt_suggestion || 'Add descriptive alt text') : 'Add descriptive alt text',
                filename: fileData.filename || 'Unknown file',
                file_type: fileData.file_type || 'unknown'
              });
            });
          }
        });
      }
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
          { x: 800, y: 150, type: 'Nesting issues' },
          { x: 250, y: 100, type: 'low_contrast', w: 150, h: 40, ratio: 2.90 },
          { x: 500, y: 300, type: 'low_contrast', w: 120, h: 25, ratio: 3.25 },
          { x: 650, y: 200, type: 'low_contrast', w: 80, h: 30, ratio: 2.51 }
        ]
      }];
    }

    const result = {
      overallScore,
      aria: { ...aria, details: ariaDetails },
      altText: { ...altText, details: altTextDetails },
      structure: { ...structure, details: structureDetails },
      files,
      screenshots
    };

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
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden text-white">
        {/* Silk Background */}
        <div className="absolute inset-0 z-0">
          <Silk
            speed={2}
            scale={2.2}
            color="#101010ff"
            noiseIntensity={0.8}
            rotation={0.05}
          />
        </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 md:p-6 lg:p-8">
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
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
            <DashboardHeader 
              filesCount={analysisData.files.length}
              issuesCount={totalIssues}
              completedAt={completedAt}
            />
            <button
              onClick={handleNewAnalysis}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              New Analysis
            </button>
          </div>

          {/* Visual-First Layout */}
          <div className="space-y-8">
            {/* Hero Section - Visual Analysis */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Visual Analysis - Takes center stage */}
              <div className="xl:col-span-3">
                <VisualAnalysis screenshots={analysisData.screenshots} />
              </div>
              
              {/* Quick Metrics Sidebar */}
              <div className="xl:col-span-1 space-y-6">
                <OverallScore score={analysisData.overallScore} />
                <MetricsPanel 
                  aria={analysisData.aria}
                  altText={analysisData.altText}
                  structure={analysisData.structure}
                />
                <FilesAnalyzed files={analysisData.files} />
              </div>
            </div>

            {/* Detailed Analysis Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
              {/* ARIA Analysis */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-800 flex-shrink-0">
                  <h3 className="font-semibold text-lg flex items-center gap-3">
                    <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <span className="text-blue-300 text-sm font-medium">ARIA</span>
                    </div>
                    ARIA Labels
                  </h3>
                  <p className="text-sm text-zinc-400 mt-2">Missing accessibility labels</p>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  <ARIASection data={{
                    score: analysisData.aria.score,
                    totalElements: analysisData.aria.details?.length || 0,
                    issuesCount: analysisData.aria.issues,
                    topMissingType: (analysisData.aria.details?.[0]?.element_type as string) || 
                                   (analysisData.aria.details?.[0]?.type as string) || 
                                   (analysisData.aria.details?.[0]?.tag_name as string) || 'button',
                    topMissingCount: analysisData.aria.issues,
                    sampleCode: (analysisData.aria.details?.[0]?.element_html as string) || 
                               (analysisData.aria.details?.[0]?.element as string) || 
                               (analysisData.aria.details?.[0]?.html as string) || 
                               (analysisData.aria.details?.[0]?.code as string) || '<button onclick="submit()">Submit</button>',
                    allMissingElements: (analysisData.aria.details || []).map((item: any) => ({
                      type: item.element_type || item.type || item.tag_name || 'unknown',
                      code: item.element_html || item.element || item.html || item.code || item.tag || 'No code available',
                      location: item.context || item.location || item.position || 'Unknown location',
                      filename: item.filename || item.file || item.source || 'Unknown file'
                    })),
                    missingByType: (analysisData.aria.details || []).reduce((acc: any, item: any) => {
                      const type = item.element_type || item.type || item.tag_name || 'unknown';
                      acc[type] = (acc[type] || 0) + 1;
                      return acc;
                    }, {})
                  }} />
                </div>
              </div>

              {/* Alt Text Analysis */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-800 flex-shrink-0">
                  <h3 className="font-semibold text-lg flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                      <span className="text-emerald-300 text-sm font-medium">ALT</span>
                    </div>
                    Alt Text
                  </h3>
                  <p className="text-sm text-zinc-400 mt-2">Missing image descriptions</p>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  <AltTextSection data={{
                    score: analysisData.altText.score,
                    totalImages: (analysisData.altText.details?.length || 0) + analysisData.altText.issues,
                    issuesCount: analysisData.altText.issues,
                    percentage: analysisData.altText.issues > 0 && (analysisData.altText.details?.length || 0) > 0 ? 
                      (analysisData.altText.issues / ((analysisData.altText.details?.length || 0) + analysisData.altText.issues)) * 100 : 0,
                    sampleMissingTag: (analysisData.altText.details?.[0] as any)?.tag_html || '<img src="logo.png">',
                    allMissingTags: (analysisData.altText.details || []).map((item: any) => ({
                      tag: item.tag_html || item.tag || item.html || 'No code available',
                      filename: item.filename || 'Unknown file',
                      suggestion: item.suggestion || 'Add descriptive alt text'
                    }))
                  }} />
                </div>
              </div>

              {/* Structure Analysis */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden flex flex-col lg:col-span-2 xl:col-span-1">
                <div className="p-6 border-b border-zinc-800 flex-shrink-0">
                  <h3 className="font-semibold text-lg flex items-center gap-3">
                    <div className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-lg">
                      <span className="text-violet-300 text-sm font-medium">HTML</span>
                    </div>
                    Structure
                  </h3>
                  <p className="text-sm text-zinc-400 mt-2">HTML hierarchy issues</p>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  <StructureSection data={{
                    score: analysisData.structure.score,
                    totalChecks: analysisData.structure.details?.length || 0,
                    issuesCount: analysisData.structure.issues,
                    htmlIssues: (analysisData.structure.details || []).filter((item: any) => {
                      const category = (item.category as string)?.toLowerCase() || '';
                      const type = (item.type as string)?.toLowerCase() || '';
                      const filename = ((item.filename as string) || (item.file as string) || '').toLowerCase();
                      return category.includes('html') || type.includes('html') || filename.endsWith('.html');
                    }).length,
                    cssIssues: (analysisData.structure.details || []).filter((item: any) => {
                      const category = (item.category as string)?.toLowerCase() || '';
                      const type = (item.type as string)?.toLowerCase() || '';
                      const filename = ((item.filename as string) || (item.file as string) || '').toLowerCase();
                      return category.includes('css') || type.includes('css') || filename.endsWith('.css');
                    }).length,
                    jsIssues: (analysisData.structure.details || []).filter((item: any) => {
                      const category = (item.category as string)?.toLowerCase() || '';
                      const type = (item.type as string)?.toLowerCase() || '';
                      const filename = ((item.filename as string) || (item.file as string) || '').toLowerCase();
                      return category.includes('js') || category.includes('javascript') || 
                             type.includes('js') || type.includes('javascript') ||
                             filename.endsWith('.js') || filename.endsWith('.ts');
                    }).length,
                    sampleIssue: analysisData.structure.details?.[0] ? (() => {
                      const item = analysisData.structure.details[0];
                      const filename = ((item.filename as string) || (item.file as string) || '').toLowerCase();
                      const type = (item.type as string)?.toLowerCase() || '';
                      const category = (item.category as string)?.toLowerCase() || '';
                      
                      let detectedCategory = 'HTML';
                      if (filename.endsWith('.js') || filename.endsWith('.ts') || 
                          type.includes('js') || category.includes('js')) {
                        detectedCategory = 'JS';
                      } else if (filename.endsWith('.css') || 
                                type.includes('css') || category.includes('css')) {
                        detectedCategory = 'CSS';
                      }
                      
                      return {
                        type: (item.type as string) || 'unknown-issue',
                        message: (item.message as string) || 'Issue found',
                        code: (item.code as string) || 'No code available',
                        filename: (item.filename as string) || (item.file as string) || 'Unknown file',
                        line: (item.line as number) || 1,
                        category: detectedCategory
                      };
                    })() : {
                      type: 'no-issues',
                      message: 'No structural issues found',
                      code: '<div>No issues detected</div>',
                      filename: 'N/A',
                      line: 1,
                      category: 'HTML'
                    },
                    allIssues: (analysisData.structure.details || []).map((item: any) => {
                      const filename = ((item.filename as string) || (item.file as string) || '').toLowerCase();
                      const type = (item.type as string)?.toLowerCase() || '';
                      const category = (item.category as string)?.toLowerCase() || '';
                      
                      let detectedCategory = 'HTML';
                      if (filename.endsWith('.js') || filename.endsWith('.ts') || 
                          type.includes('js') || category.includes('js')) {
                        detectedCategory = 'JS';
                      } else if (filename.endsWith('.css') || 
                                type.includes('css') || category.includes('css')) {
                        detectedCategory = 'CSS';
                      }
                      
                      return {
                        type: (item.type as string) || 'unknown',
                        message: (item.message as string) || 'Issue found',
                        code: (item.code as string) || 'No code available',
                        filename: (item.filename as string) || (item.file as string) || 'Unknown file',
                        line: (item.line as number) || 1,
                        category: detectedCategory
                      };
                    })
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Debug info (remove for production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 space-y-4">
              <details className="p-4 bg-zinc-900 rounded-lg">
                <summary className="text-sm text-zinc-400 cursor-pointer">Debug: Processed Analysis Data</summary>
                <pre className="mt-2 text-xs text-zinc-500 overflow-auto max-h-96">
                  {JSON.stringify(analysisData, null, 2)}
                </pre>
              </details>
              
              <details className="p-4 bg-zinc-900 rounded-lg">
                <summary className="text-sm text-zinc-400 cursor-pointer">Debug: ARIA Details Raw</summary>
                <pre className="mt-2 text-xs text-zinc-500 overflow-auto max-h-96">
                  {JSON.stringify(analysisData.aria.details, null, 2)}
                </pre>
              </details>
              
              <details className="p-4 bg-zinc-900 rounded-lg">
                <summary className="text-sm text-zinc-400 cursor-pointer">Debug: Alt-Text Details Raw</summary>
                <pre className="mt-2 text-xs text-zinc-500 overflow-auto max-h-96">
                  {JSON.stringify(analysisData.altText.details, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
    </PageTransition>
  );
}