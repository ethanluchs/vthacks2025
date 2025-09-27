import { Camera, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface Issue {
  x: number;
  y: number;
  type: string;
}

interface Screenshot {
  url: string;
  title: string;
  issues: Issue[];
}

interface VisualAnalysisProps {
  screenshots: Screenshot[];
}

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
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-zinc-400" />
          <span className="font-medium text-sm">Visual Analysis</span>
          {hasMultiple && (
            <span className="text-xs text-zinc-500">
              {currentScreenshot.title} ({currentIndex + 1}/{screenshots.length})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasMultiple && (
            <>
              <button
                onClick={goToPrevious}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNext}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4 h-[calc(100%-65px)]">
        <div className="relative bg-zinc-800 rounded h-full overflow-hidden">
          <Image 
            src={currentScreenshot.url} 
            alt={`Screenshot: ${currentScreenshot.title}`}
            fill
            className="object-contain"
          />
          
          {/* Issue Markers */}
          {currentScreenshot.issues.map((issue, index) => (
            <div 
              key={index}
              className="absolute w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center cursor-pointer group"
              style={{ 
                left: `${(issue.x / 1200) * 100}%`, 
                top: `${(issue.y / 800) * 100}%` 
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full"></div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-700 z-10">
                {issue.type}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}