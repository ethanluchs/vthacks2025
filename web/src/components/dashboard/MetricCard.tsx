'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  score: number;
  issues: number;
  color: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function MetricCard({ 
  title, 
  score, 
  issues, 
  color, 
  children, 
  defaultExpanded = false 
}: MetricCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Card Header - Always Visible */}
      <div 
        className="p-6 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }}></div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-zinc-400">{issues} issues</div>
            </div>
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="border-t border-zinc-800">
          <div className="p-6 pt-6 bg-gradient-to-b from-zinc-900/50 to-zinc-900/70">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}