'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIFixButtonProps {
  code: string;
  issueType: string;
  context?: string;
  onAIFix: (result: { originalCode: string; improvedCode: string; explanation: string }) => void;
  className?: string;
}

export default function AIFixButton({ code, issueType, context, onAIFix, className = '' }: AIFixButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAIFix = async () => {
    setLoading(true);
    try {
      console.log('Making AI fix request with:', { code, issueType, context });
      
      const response = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, issueType, context }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('AI Fix result:', result);
      onAIFix(result);
    } catch (error) {
      console.error('AI Fix error:', error);
      // Could show error toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAIFix}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 
        bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 
        hover:from-blue-500/30 hover:via-purple-500/30 hover:to-cyan-500/30
        border border-blue-500/30 hover:border-blue-400/50
        rounded-lg text-sm font-medium 
        text-blue-300 hover:text-blue-200
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      {loading ? 'Generating...' : 'AI Fix'}
    </button>
  );
}