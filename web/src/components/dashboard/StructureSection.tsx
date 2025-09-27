'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface StructureIssue {
  type: string;
  message: string;
  code: string;
  filename: string;
  line: number;
  category: string;
}

interface StructureData {
  score: number;
  totalChecks: number;
  issuesCount: number;
  htmlIssues: number;
  cssIssues: number;
  jsIssues: number;
  sampleIssue: StructureIssue;
  allIssues: StructureIssue[];
}

interface StructureSectionProps {
  data: StructureData;
}

export default function StructureSection({ data }: StructureSectionProps) {
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const filteredIssues = selectedCategory === 'all' 
    ? data.allIssues 
    : data.allIssues.filter(issue => issue.category === selectedCategory);

  const categoryColors: Record<string, string> = {
    all: 'bg-violet-600',
    HTML: 'bg-orange-600',
    CSS: 'bg-blue-600',
    JS: 'bg-yellow-600'
  };

  return (
    <div className="space-y-4">
      {/* Category Overview */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: 'all', label: 'All', count: data.issuesCount },
          { key: 'HTML', label: 'HTML', count: data.htmlIssues },
          { key: 'CSS', label: 'CSS', count: data.cssIssues },
          { key: 'JS', label: 'JS', count: data.jsIssues }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`p-3 rounded text-center text-sm transition-colors ${
              selectedCategory === key 
                ? `${categoryColors[key]} text-white` 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <div className="font-semibold">{label}</div>
            <div className="text-xs opacity-70">{count}</div>
          </button>
        ))}
      </div>

      {/* Sample Issue */}
      {data.sampleIssue && (
        <div>
          <div className="text-sm font-medium mb-2">Sample Issue:</div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm text-red-400 mb-2">
              {data.sampleIssue.type.replace(/_/g, ' ')}
            </div>
            <div className="text-sm text-zinc-300 mb-2">{data.sampleIssue.message}</div>
            <div className="bg-zinc-950 rounded p-2 font-mono text-xs text-zinc-300 overflow-x-auto">
              {data.sampleIssue.code}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {data.sampleIssue.filename} • Line {data.sampleIssue.line}
            </div>
          </div>
        </div>
      )}

      {/* View All Toggle */}
      <button
        onClick={() => setShowAllIssues(!showAllIssues)}
        className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2"
      >
        {showAllIssues ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {showAllIssues ? 'Hide' : 'Show'} all {filteredIssues.length} issues
        {selectedCategory !== 'all' && ` (${selectedCategory})`}
      </button>

      {/* All Issues List */}
      {showAllIssues && (
        <div className="space-y-3 max-h-64 overflow-y-auto border-t border-zinc-800 pt-4">
          {filteredIssues.map((issue, index) => (
            <div key={index} className="bg-zinc-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                <div className={`w-2 h-2 rounded-full ${categoryColors[issue.category]}`}></div>
                <span>{issue.filename}</span>
                <span>Line {issue.line}</span>
                <span className="text-red-400">{issue.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-sm text-zinc-300 mb-2">{issue.message}</div>
              <div className="bg-zinc-950 rounded p-2 font-mono text-xs text-zinc-300 overflow-x-auto">
                {issue.code}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}