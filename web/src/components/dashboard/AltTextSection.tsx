'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Image } from 'lucide-react';

interface MissingTag {
  tag: string;
  filename: string;
  suggestion: string;
}

interface AltTextData {
  score: number;
  totalImages: number;
  issuesCount: number;
  percentage: number;
  sampleMissingTag: string;
  allMissingTags: MissingTag[];
}

interface AltTextSectionProps {
  data: AltTextData;
}

export default function AltTextSection({ data }: AltTextSectionProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  return (
    <div className="space-y-4">
      {/* Key Insight */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center">
              <Eye className="w-6 h-6 text-emerald-500" />
            </div>
            <div 
              className="absolute inset-0 rounded-full border-4 border-emerald-500" 
              style={{ 
                clipPath: `polygon(0 0, ${100 - data.percentage}% 0, ${100 - data.percentage}% 100%, 0 100%)` 
              }}
            >
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{data.percentage.toFixed(1)}%</div>
            <div className="text-sm text-zinc-400">
              {data.issuesCount} of {data.totalImages} images missing alt text
            </div>
          </div>
        </div>
      </div>

      {/* Sample Missing Tag */}
      <div>
        <div className="text-sm font-medium mb-2">Sample Issue:</div>
        <div className="bg-zinc-950 rounded-lg p-3 font-mono text-sm text-zinc-300 mb-2">
          {data.sampleMissingTag}
        </div>
        {showSuggestions && (
          <div className="text-sm text-emerald-400">
            💡 Suggested: alt="Hero banner showcasing main content"
          </div>
        )}
      </div>

      {/* Toggle Suggestions */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showSuggestions}
          onChange={(e) => setShowSuggestions(e.target.checked)}
          className="rounded"
        />
        Show AI-suggested alt texts
      </label>

      {/* View All Toggle */}
      <button
        onClick={() => setShowAllTags(!showAllTags)}
        className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2"
      >
        {showAllTags ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {showAllTags ? 'Hide' : 'Show'} all {data.issuesCount} missing alt texts
      </button>

      {/* All Tags List */}
      {showAllTags && (
        <div className="space-y-3 max-h-64 overflow-y-auto border-t border-zinc-800 pt-4">
          {data.allMissingTags.map((item, index) => (
            <div key={index} className="bg-zinc-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                <Image className="w-3 h-3" />
                <span>{item.filename}</span>
              </div>
              <div className="bg-zinc-950 rounded p-2 font-mono text-xs text-zinc-300 mb-2 overflow-x-auto">
                {item.tag}
              </div>
              {showSuggestions && (
                <div className="text-xs text-emerald-400">
                  💡 Suggested: alt="{item.suggestion}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
