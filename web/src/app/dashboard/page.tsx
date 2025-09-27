'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText } from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import ARIASection from '@/components/dashboard/ARIASection';
import AltTextSection from '@/components/dashboard/AltTextSection';
import StructureSection from '@/components/dashboard/StructureSection';
import VisualAnalysis from '@/components/dashboard/VisualAnalysis';
import { BackendAnalysisResponse } from '@/lib/types';

interface Screenshot {
    url: string;
    title: string;
    issues: Array<{ x: number; y: number; type: string }>;
}

interface MissingElement {
    type: string;
    code: string;
    location: string;
    filename: string;
}

interface MissingTag {
    tag: string;
    filename: string;
    suggestion: string;
}

interface StructureIssue {
    type: string;
    message: string;
    code: string;
    filename: string;
    line: number;
    category: string;
}

interface AnalysisResults {
    overallScore: number;
    aria: {
        score: number;
        totalElements: number;
        issuesCount: number;
        topMissingType: string;
        topMissingCount: number;
        sampleCode: string;
        allMissingElements: MissingElement[];
        missingByType: Record<string, number>;
    };
    altText: {
        score: number;
        totalImages: number;
        issuesCount: number;
        percentage: number;
        sampleMissingTag: string;
        allMissingTags: MissingTag[];
    };
    structure: {
        score: number;
        totalChecks: number;
        issuesCount: number;
        htmlIssues: number;
        cssIssues: number;
        jsIssues: number;
        sampleIssue: StructureIssue;
        allIssues: StructureIssue[];
    };
    files: string[];
    screenshots: Screenshot[];
}

// Helper functions
const extractElementType = (elementString: string): string => {
    const match = elementString.match(/<(\w+)/);
    return match ? match[1] : 'unknown';
};

const extractFilename = (location: string): string => {
    const match = location.match(/([^/\\]+\.(html|css|js))/) || location.match(/Line \d+: (.+)/);
    return match ? match[1] : 'unknown';
};

const extractLineNumber = (location: string): number => {
    const match = location.match(/Line (\d+)/);
    return match ? parseInt(match[1]) : 1;
};

const categorizeIssue = (issueType: string): string => {
    if (issueType.includes('HTML')) return 'HTML';
    if (issueType.includes('CSS')) return 'CSS';
    if (issueType.includes('JS')) return 'JS';
    return 'HTML'; // default
};

// Sample data for development/demo
const getSampleData = (): AnalysisResults => {
    return {
        overallScore: 68,
        aria: {
            score: 68,
            totalElements: 25,
            issuesCount: 8,
            topMissingType: 'button',
            topMissingCount: 4,
            sampleCode: '<button class="submit-btn">Submit Form</button>',
            allMissingElements: [
                {
                    type: 'button',
                    code: '<button class="submit-btn">Submit Form</button>',
                    location: 'Line 45: <button class="submit-btn">Submit Form</button>',
                    filename: 'index.html'
                },
                {
                    type: 'button',
                    code: '<button onclick="toggleMenu()">☰</button>',
                    location: 'Line 12: <button onclick="toggleMenu()">☰</button>',
                    filename: 'index.html'
                },
                {
                    type: 'a',
                    code: '<a href="/about">Learn More</a>',
                    location: 'Line 67: <a href="/about">Learn More</a>',
                    filename: 'index.html'
                },
                {
                    type: 'input',
                    code: '<input type="email" placeholder="Email">',
                    location: 'Line 89: <input type="email" placeholder="Email">',
                    filename: 'contact.html'
                }
            ],
            missingByType: { button: 4, a: 2, input: 2 }
        },
        altText: {
            score: 67,
            totalImages: 12,
            issuesCount: 4,
            percentage: 33.3,
            sampleMissingTag: '<img src="hero-banner.jpg" class="hero-image">',
            allMissingTags: [
                {
                    tag: '<img src="hero-banner.jpg" class="hero-image">',
                    filename: 'index.html',
                    suggestion: 'Hero banner showcasing main content'
                },
                {
                    tag: '<img src="./assets/logo.png" width="120">',
                    filename: 'index.html',
                    suggestion: 'Company logo'
                },
                {
                    tag: '<img src="product-1.jpg">',
                    filename: 'products.html',
                    suggestion: 'Product showcase image'
                },
                {
                    tag: '<img src="team-photo.jpg" class="team">',
                    filename: 'about.html',
                    suggestion: 'Team photo'
                }
            ]
        },
        structure: {
            score: 67,
            totalChecks: 30,
            issuesCount: 6,
            htmlIssues: 3,
            cssIssues: 2,
            jsIssues: 1,
            sampleIssue: {
                type: 'HTML_IMPROPER_NESTING',
                message: 'Invalid nesting: <div> inside <p>',
                code: '<p>Some text <div>Block inside inline</div></p>',
                filename: 'index.html',
                line: 67,
                category: 'HTML'
            },
            allIssues: [
                {
                    type: 'HTML_IMPROPER_NESTING',
                    message: 'Invalid nesting: <div> inside <p>',
                    code: '<p>Some text <div>Block inside inline</div></p>',
                    filename: 'index.html',
                    line: 67,
                    category: 'HTML'
                },
                {
                    type: 'CSS_NESTED_SELECTORS',
                    message: 'Nested selectors detected (invalid in standard CSS)',
                    code: '.container { .nested { color: red; } }',
                    filename: 'styles.css',
                    line: 23,
                    category: 'CSS'
                },
                {
                    type: 'HTML_UNCLOSED_TAG',
                    message: 'Unclosed div element detected',
                    code: '<div class="content">',
                    filename: 'index.html',
                    line: 15,
                    category: 'HTML'
                },
                {
                    type: 'CSS_SYNTAX_ERROR',
                    message: 'Missing semicolon in CSS rule',
                    code: 'color: blue',
                    filename: 'styles.css',
                    line: 45,
                    category: 'CSS'
                },
                {
                    type: 'HTML_INVALID_ATTRIBUTE',
                    message: 'Invalid HTML attribute detected',
                    code: '<img src="test.jpg" invalid-attr="value">',
                    filename: 'gallery.html',
                    line: 12,
                    category: 'HTML'
                },
                {
                    type: 'JS_SYNTAX_ERROR',
                    message: 'Unclosed parenthesis in JavaScript',
                    code: 'function test( {',
                    filename: 'script.js',
                    line: 34,
                    category: 'JS'
                }
            ]
        },
        files: ['index.html', 'styles.css', 'script.js', 'contact.html', 'about.html'],
        screenshots: [
            {
                url: '/tarey.jpeg',
                title: 'Main Page',
                issues: [
                    { x: 120, y: 200, type: 'Missing ARIA label' },
                    { x: 300, y: 450, type: 'No alt text' },
                    { x: 800, y: 150, type: 'Poor contrast' }
                ]
            }
        ]
    };
};

export default function Dashboard() {
    const [analysisData, setAnalysisData] = useState<AnalysisResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();



    useEffect(() => {
        // Get analysis results from sessionStorage
        const storedResults = sessionStorage.getItem('analysisResults');

        if (!storedResults) {
            // Use sample data for development/demo purposes
            console.log('No stored results found, using sample data');
            setAnalysisData(getSampleData());
            setLoading(false);
            return;
        }

        try {
            const results = JSON.parse(storedResults);
            setAnalysisData(processAnalysisResults(results));
        } catch (error) {
            console.error('Error parsing analysis results:', error);
            // Fallback to sample data on error
            setAnalysisData(getSampleData());
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

        // Extract ARIA data
        const ariaIssues = rawResults.aria?.total_without_aria || 0;
        const ariaTotal = rawResults.aria?.total_elements || 1;
        const ariaMissingElements = (rawResults.aria?.missing_elements || []).map(el => ({
            type: extractElementType(el.element),
            code: el.element,
            location: el.location,
            filename: extractFilename(el.location)
        }));

        // Calculate missing by type for ARIA
        const missingByType: Record<string, number> = {};
        ariaMissingElements.forEach(el => {
            missingByType[el.type] = (missingByType[el.type] || 0) + 1;
        });

        const topMissingType = Object.keys(missingByType).reduce((a, b) => 
            missingByType[a] > missingByType[b] ? a : b, Object.keys(missingByType)[0] || 'button'
        );

        const aria = {
            score: calculateScore(ariaIssues, ariaTotal),
            totalElements: ariaTotal,
            issuesCount: ariaIssues,
            topMissingType,
            topMissingCount: missingByType[topMissingType] || 0,
            sampleCode: ariaMissingElements[0]?.code || '<button class="submit-btn">Submit Form</button>',
            allMissingElements: ariaMissingElements,
            missingByType
        };

        // Extract Alt Text data
        const altTextIssues = rawResults.altText?.images_without_alt || 0;
        const altTextTotal = rawResults.altText?.total_images || 1;
        const altTextMissing = (rawResults.altText?.details || []).map(item => ({
            tag: `<img src="${item.src}">`,
            filename: extractFilename(item.location),
            suggestion: item.suggestion
        }));

        const altText = {
            score: calculateScore(altTextIssues, altTextTotal),
            totalImages: altTextTotal,
            issuesCount: altTextIssues,
            percentage: altTextTotal > 0 ? (altTextIssues / altTextTotal) * 100 : 0,
            sampleMissingTag: altTextMissing[0]?.tag || '<img src="hero-banner.jpg" class="hero-image">',
            allMissingTags: altTextMissing
        };

        // Extract Structure data
        const structureIssues = rawResults.structure?.total_issues || 0;
        const structureTotal = rawResults.structure?.total_checks || 1;
        const structureIssuesList = (rawResults.structure?.issues || []).map(issue => ({
            type: issue.type,
            message: issue.description,
            code: issue.element,
            filename: extractFilename(issue.location),
            line: extractLineNumber(issue.location),
            category: categorizeIssue(issue.type)
        }));

        const htmlIssues = structureIssuesList.filter(i => i.category === 'HTML').length;
        const cssIssues = structureIssuesList.filter(i => i.category === 'CSS').length;
        const jsIssues = structureIssuesList.filter(i => i.category === 'JS').length;

        const structure = {
            score: calculateScore(structureIssues, structureTotal),
            totalChecks: structureTotal,
            issuesCount: structureIssues,
            htmlIssues,
            cssIssues,
            jsIssues,
            sampleIssue: structureIssuesList[0] || {
                type: 'HTML_IMPROPER_NESTING',
                message: 'Invalid nesting detected',
                code: '<p>Some text <div>Block inside inline</div></p>',
                filename: 'index.html',
                line: 67,
                category: 'HTML'
            },
            allIssues: structureIssuesList
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

    const totalIssues = analysisData.aria.issuesCount + analysisData.altText.issuesCount + analysisData.structure.issuesCount;
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
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Accessibility Report</h1>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                <span>{analysisData.files.length} files analyzed</span>
                                <span>•</span>
                                <span>{totalIssues} total issues</span>
                                <span>•</span>
                                <span>Just now</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors">
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNewAnalysis}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                            >
                                New Analysis
                            </button>
                        </div>
                    </div>

                    {/* Compact Score Summary */}
                    <div className="mb-6">
                        <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <div className="text-sm text-zinc-400">Overall Score</div>
                                        <div className="text-2xl font-bold text-amber-500">{analysisData.overallScore}%</div>
                                    </div>
                                    <div className="w-32 bg-zinc-800 rounded-full h-2">
                                        <div 
                                            className="h-2 rounded-full bg-amber-500"
                                            style={{ width: `${analysisData.overallScore}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <FileText className="w-4 h-4" />
                                    <span>{analysisData.files.length} files analyzed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hero Section - Visual Analysis */}
                    <div className="mb-8">
                        <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="p-6 border-b border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold mb-1">Visual Analysis</h2>
                                        <p className="text-sm text-zinc-400">
                                            Click on markers to see accessibility issues
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span className="text-zinc-400">Issues found</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <VisualAnalysis screenshots={analysisData.screenshots} />
                            </div>
                        </div>
                    </div>

                    {/* Metrics Summary Cards */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-6 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <h3 className="font-semibold">ARIA Labels</h3>
                                </div>
                                <div className="text-2xl font-bold text-red-400">
                                    {analysisData.aria.score}%
                                </div>
                            </div>
                            <div className="text-sm text-zinc-400 mb-2">
                                {analysisData.aria.issuesCount} elements missing labels
                            </div>
                            <div className="text-xs text-zinc-500">
                                Most issues: {analysisData.aria.topMissingType} elements
                            </div>
                        </div>

                        <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-6 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <h3 className="font-semibold">Alt Text</h3>
                                </div>
                                <div className="text-2xl font-bold text-red-400">
                                    {analysisData.altText.score}%
                                </div>
                            </div>
                            <div className="text-sm text-zinc-400 mb-2">
                                {analysisData.altText.issuesCount} images without alt text
                            </div>
                            <div className="text-xs text-zinc-500">
                                {analysisData.altText.percentage.toFixed(1)}% of images affected
                            </div>
                        </div>

                        <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-6 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <h3 className="font-semibold">Structure</h3>
                                </div>
                                <div className="text-2xl font-bold text-red-400">
                                    {analysisData.structure.score}%
                                </div>
                            </div>
                            <div className="text-sm text-zinc-400 mb-2">
                                {analysisData.structure.issuesCount} structural issues
                            </div>
                            <div className="text-xs text-zinc-500">
                                HTML: {analysisData.structure.htmlIssues}, CSS: {analysisData.structure.cssIssues}, JS: {analysisData.structure.jsIssues}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analysis Sections */}
                    <div className="space-y-6">
                        <MetricCard
                            title="ARIA Labels Details"
                            score={analysisData.aria.score}
                            issues={analysisData.aria.issuesCount}
                            color="#3B82F6"
                            defaultExpanded={false}
                        >
                            <ARIASection data={analysisData.aria} />
                        </MetricCard>

                        <MetricCard
                            title="Alt Text Details"
                            score={analysisData.altText.score}
                            issues={analysisData.altText.issuesCount}
                            color="#10B981"
                            defaultExpanded={false}
                        >
                            <AltTextSection data={analysisData.altText} />
                        </MetricCard>

                        <MetricCard
                            title="Structure Details"
                            score={analysisData.structure.score}
                            issues={analysisData.structure.issuesCount}
                            color="#8B5CF6"
                            defaultExpanded={false}
                        >
                            <StructureSection data={analysisData.structure} />
                        </MetricCard>
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