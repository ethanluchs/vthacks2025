import { Camera, Download, ChevronLeft, ChevronRight, Eye, AlertTriangle, XCircle } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface Issue {
  x: number;
  y: number;
  type: string;
  w?: number;
  h?: number;
  ratio?: number;
}

interface Screenshot {
  url: string;
  title: string;
  issues: Issue[];
}

interface VisualAnalysisProps {
  screenshots: Screenshot[];
}

// Helper functions for contrast analysis
const getWCAGCompliance = (ratio: number) => {
  if (ratio >= 7) return { level: 'AAA', status: 'pass', color: 'text-green-400', icon: Eye };
  if (ratio >= 4.5) return { level: 'AA', status: 'pass', color: 'text-green-400', icon: Eye };
  if (ratio >= 3) return { level: 'Fail', status: 'warning', color: 'text-yellow-400', icon: AlertTriangle };
  return { level: 'Fail', status: 'fail', color: 'text-red-400', icon: XCircle };
};

const getRequiredRatio = (ratio: number) => {
  if (ratio < 4.5) return '4.5:1 for AA compliance';
  if (ratio < 7) return '7:1 for AAA compliance';
  return 'Already compliant';
};

const getSuggestedFix = (ratio: number) => {
  if (ratio < 3) return 'Increase contrast significantly - consider darker text or lighter background';
  if (ratio < 4.5) return 'Slightly increase contrast for AA compliance';
  if (ratio < 7) return 'Increase contrast for AAA compliance';
  return 'Contrast is sufficient';
};

export default function VisualAnalysis({ screenshots }: VisualAnalysisProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentScreenshot = screenshots[currentIndex];
  const hasMultiple = screenshots.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => prev === 0 ? screenshots.length - 1 : prev - 1);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => prev === screenshots.length - 1 ? 0 : prev + 1);
  };

  if (!currentScreenshot) {
    return (
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg h-full flex items-center justify-center">
        <p className="text-zinc-500">No screenshots available</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/70 border border-zinc-700/50 rounded-xl h-full shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Camera className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-lg">Visual Analysis</h2>
            {hasMultiple && (
              <p className="text-sm text-zinc-400 truncate">
                {currentScreenshot.title} • {currentIndex + 1} of {screenshots.length}
              </p>
            )}
          </div>
          
          {/* Issue Count Badge */}
          <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full flex-shrink-0">
            <span className="text-red-300 text-sm font-medium">
              {currentScreenshot.issues.length} issues
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasMultiple && (
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <button
                onClick={goToPrevious}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all rounded-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs text-zinc-400 px-2">
                {currentIndex + 1}/{screenshots.length}
              </div>
              <button
                onClick={goToNext}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all rounded-md"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <button className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all rounded-md border border-zinc-700/50">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col min-h-0">
        <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl flex-1 overflow-hidden border border-zinc-700/50 shadow-inner" style={{ minHeight: '500px' }}>
          <Image 
            src={currentScreenshot.url} 
            alt={`Screenshot: ${currentScreenshot.title}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
          />
          
          {/* Issue Markers */}
          {currentScreenshot.issues.map((issue, index) => {
            const isContrastIssue = issue.type === 'low_contrast' && issue.ratio !== undefined;
            const compliance = isContrastIssue ? getWCAGCompliance(issue.ratio!) : null;
            const ComplianceIcon = compliance?.icon;
            
            return (
              <div 
                key={index}
                className="absolute group cursor-pointer z-10"
                style={{ 
                  left: `${(issue.x / 1200) * 100}%`, 
                  top: `${(issue.y / 800) * 100}%`,
                  width: issue.w ? `${(issue.w / 1200) * 100}%` : '24px',
                  height: issue.h ? `${(issue.h / 800) * 100}%` : '24px',
                }}
              >
                {/* Issue Marker */}
                <div className={`
                  ${isContrastIssue ? 'w-full h-full' : 'w-6 h-6'} 
                  ${isContrastIssue 
                    ? 'border-2 border-red-500 bg-red-500/20' 
                    : 'bg-red-500 rounded-full border-2 border-white flex items-center justify-center'
                  }
                  hover:scale-110 transition-transform shadow-lg
                `}>
                  {!isContrastIssue && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  {isContrastIssue && issue.ratio && (
                    <div className="text-xs font-bold text-white bg-red-600/80 px-1 rounded text-center">
                      {issue.ratio.toFixed(1)}
                    </div>
                  )}
                </div>
                
                {/* Enhanced Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20">
                  <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-600/50 rounded-lg p-4 shadow-xl min-w-64">
                    {isContrastIssue && issue.ratio !== undefined && compliance && ComplianceIcon ? (
                      // Contrast Issue Tooltip
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ComplianceIcon className={`w-4 h-4 ${compliance.color}`} />
                          <span className="font-semibold text-white">Contrast Issue</span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-300">Current Ratio:</span>
                            <span className={`font-mono ${compliance.color}`}>{issue.ratio.toFixed(2)}:1</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-zinc-300">WCAG Status:</span>
                            <span className={`font-medium ${compliance.color}`}>{compliance.level}</span>
                          </div>
                          
                          <div className="pt-2 border-t border-zinc-700">
                            <div className="text-zinc-300 text-xs mb-1">Required:</div>
                            <div className="text-zinc-400 text-xs">{getRequiredRatio(issue.ratio)}</div>
                          </div>
                          
                          <div>
                            <div className="text-zinc-300 text-xs mb-1">Suggestion:</div>
                            <div className="text-zinc-400 text-xs">{getSuggestedFix(issue.ratio)}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Generic Issue Tooltip
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="font-semibold text-white">Accessibility Issue</span>
                        </div>
                        <div className="text-sm text-zinc-300">{issue.type}</div>
                        <div className="text-xs text-zinc-400">Click to view details</div>
                      </div>
                    )}
                    
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95"></div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}