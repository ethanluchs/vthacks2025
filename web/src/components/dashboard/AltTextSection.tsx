'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Image as ImageIcon, Code2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MissingTag {
  tag?: string;
  filename?: string;
  suggestion?: string;
  html?: string;
  element_html?: string;
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
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          Sample Issue:
        </div>
        <div className="rounded-lg overflow-hidden border border-zinc-700/50 mb-3">
          <SyntaxHighlighter
            language="html"
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '12px',
              background: 'rgb(9 9 11)',
              fontSize: '13px'
            }}
            showLineNumbers={false}
          >
            {data.sampleMissingTag}
          </SyntaxHighlighter>
        </div>

      </div>



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
        <div className="space-y-3 max-h-80 overflow-y-auto border-t border-zinc-800 pt-4 scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600">
          {data.allMissingTags.map((item, index) => (
            <div key={index} className="bg-zinc-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                <ImageIcon className="w-3 h-3" />
                <span>{item.filename || 'Unknown file'}</span>
              </div>
              <div className="rounded overflow-hidden border border-zinc-700/30 mb-2">
                <SyntaxHighlighter
                  language="html"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '8px',
                    background: 'rgb(9 9 11)',
                    fontSize: '11px'
                  }}
                  showLineNumbers={false}
                >
                  {item.tag || 'No code available'}
                </SyntaxHighlighter>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
