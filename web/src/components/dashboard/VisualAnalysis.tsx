import { Camera, Download } from 'lucide-react';

interface Issue {
  x: number;
  y: number;
  type: string;
}

interface VisualAnalysisProps {
  screenshot: {
    url: string;
    issues: Issue[];
  };
}

export default function VisualAnalysis({ screenshot }: VisualAnalysisProps) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-zinc-400" />
          <span className="font-medium text-sm">Visual Analysis</span>
        </div>
        <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 h-[calc(100%-65px)]">
        <div className="relative bg-zinc-800 rounded h-full overflow-hidden">
          <img 
            src={screenshot.url} 
            alt="Website screenshot"
            className="w-full h-full object-contain"
          />
          
          {/* Issue Markers */}
          {screenshot.issues.map((issue, index) => (
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-700">
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