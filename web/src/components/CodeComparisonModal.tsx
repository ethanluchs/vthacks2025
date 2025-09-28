'use client';

import { useState } from 'react';
import { X, Copy, Check, ArrowRight } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  improvedCode: string;
  explanation: string;
  issueType: string;
}

export default function CodeComparisonModal({
  isOpen,
  onClose,
  originalCode,
  improvedCode,
  explanation,
  issueType
}: CodeComparisonModalProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedImproved, setCopiedImproved] = useState(false);

  const copyToClipboard = async (text: string, type: 'original' | 'improved') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'original') {
        setCopiedOriginal(true);
        setTimeout(() => setCopiedOriginal(false), 2000);
      } else {
        setCopiedImproved(true);
        setTimeout(() => setCopiedImproved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 via-purple-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">✨</span>
              </div>
              AI Accessibility Fix
            </h2>
            <p className="text-sm text-zinc-400 mt-1">Issue type: {issueType}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Explanation */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-blue-300 mb-2">AI Explanation:</h3>
            <p className="text-sm text-zinc-300">{explanation}</p>
          </div>

          {/* Code Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Original Code */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-red-300 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Original Code (Issues)
                </h3>
                <button
                  onClick={() => copyToClipboard(originalCode, 'original')}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded transition-colors"
                >
                  {copiedOriginal ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg overflow-hidden border border-red-500/20">
                <SyntaxHighlighter
                  language="html"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: 'rgb(15 15 23)',
                    fontSize: '13px'
                  }}
                  showLineNumbers={false}
                >
                  {originalCode}
                </SyntaxHighlighter>
              </div>
            </div>

            {/* Improved Code */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-green-300 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Improved Code (Accessible)
                </h3>
                <button
                  onClick={() => copyToClipboard(improvedCode, 'improved')}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded transition-colors"
                >
                  {copiedImproved ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg overflow-hidden border border-green-500/20">
                <SyntaxHighlighter
                  language="html"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: 'rgb(15 15 23)',
                    fontSize: '13px'
                  }}
                  showLineNumbers={false}
                >
                  {improvedCode}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>

          {/* Mobile Arrow */}
          <div className="md:hidden flex items-center justify-center my-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-full border border-blue-500/30 rotate-90">
              <ArrowRight className="w-4 h-4 text-blue-300" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => copyToClipboard(improvedCode, 'improved')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-300 hover:text-blue-200 transition-all duration-200"
          >
            Copy Fixed Code
          </button>
        </div>
      </div>
    </div>
  );
}