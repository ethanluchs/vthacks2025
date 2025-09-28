'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Code2, Target } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MissingElement {
  type: string;
  code: string;
  location: string;
  filename: string;
}

interface ARIAData {
  score: number;
  totalElements: number;
  issuesCount: number;
  topMissingType: string;
  topMissingCount: number;
  sampleCode: string;
  allMissingElements: MissingElement[];
  missingByType: Record<string, number>;
}

interface ARIASectionProps {
  data: ARIAData;
}


export default function ARIASection({ data }: ARIASectionProps) {
  const [showAllElements, setShowAllElements] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredElements = selectedType
    ? data.allMissingElements.filter(el => el.type === selectedType)
    : data.allMissingElements;

  return (
    <div className="space-y-4">
      {/* Key Insight */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <div className="font-medium mb-1">Most problematic: &lt;{data.topMissingType}&gt; elements</div>
            <div className="text-sm text-zinc-400">
              {data.topMissingCount} of {data.topMissingCount + (data.totalElements - data.issuesCount)} missing accessibility labels
            </div>
          </div>
        </div>
      </div>

      {/* Sample Code */}
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
            {data.sampleCode}
          </SyntaxHighlighter>
        </div>
       
      </div>

      {/* Element Type Breakdown */}
      <div>
        <div className="text-sm font-medium mb-3">Issues by Element Type:</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.missingByType).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
              className={`p-3 rounded text-left text-sm transition-colors ${selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
            >
              <div className="font-mono">&lt;{type}&gt;</div>
              <div className="text-xs opacity-70">{count} missing</div>
            </button>
          ))}
        </div>
      </div>

      {/* View All Toggle */}
      <button
        onClick={() => setShowAllElements(!showAllElements)}
        className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2"
      >
        {showAllElements ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {showAllElements ? 'Hide' : 'Show'} all {filteredElements.length} elements
        {selectedType && ` (${selectedType})`}
      </button>

      {/* All Elements List */}
      {showAllElements && (
        <div className="space-y-3 max-h-80 overflow-y-auto border-t border-zinc-800 pt-4 scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600">
          {filteredElements.map((element, index) => (
            <div key={index} className="bg-zinc-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                <Code2 className="w-3 h-3" />
                <span>{element.filename}</span>
                <span className="text-blue-400">&lt;{element.type}&gt;</span>
              </div>
              
              {/* Debug: Show raw element data */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mb-2">
                  <summary className="text-xs text-zinc-500 cursor-pointer">Debug: Raw Data</summary>
                  <pre className="text-xs text-zinc-400 mt-1 p-2 bg-zinc-900 rounded overflow-auto">
                    {JSON.stringify(element, null, 2)}
                  </pre>
                </details>
              )}
              
              <div className="rounded overflow-hidden border border-zinc-700/30 mb-2" style={{ position: 'relative' }}>
                <SyntaxHighlighter
                  language="html"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '8px',
                    background: 'rgb(9 9 11)',
                    fontSize: '11px',
                  }}
                  showLineNumbers={false}
                >
                  {element.code}
                </SyntaxHighlighter>
              </div>
              <div className="text-xs text-zinc-500">{element.location}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
