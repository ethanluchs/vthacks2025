'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OverallScore from '@/components/dashboard/OverallScore';
import MetricsPanel from '@/components/dashboard/MetricsPanel';
import FilesAnalyzed from '@/components/dashboard/FilesAnalyzed';
import VisualAnalysis from '@/components/dashboard/VisualAnalysis';

export default function Dashboard() {
    const mockData = {
        overallScore: 78,
        aria: { score: 72, issues: 13 },
        altText: { score: 85, issues: 2 },
        structure: { score: 90, issues: 3 },
        files: ['index.html', 'styles.css', 'app.js'],
        screenshot: {
            url: '../../components/dashboard/tarey.jpeg',
            issues: [
                { x: 120, y: 200, type: 'Missing ARIA label' },
                { x: 300, y: 450, type: 'No alt text' },
                { x: 800, y: 150, type: 'Poor contrast' }
            ]
        }
    };

    const totalIssues = mockData.aria.issues + mockData.altText.issues + mockData.structure.issues;
    const completedAt = new Date();

    return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader 
          filesCount={mockData.files.length}
          issuesCount={totalIssues}
          completedAt={completedAt}
        />

        {/* Keep the original fixed height grid */}
        <div className="grid grid-cols-5 gap-6 h-[75vh]">
          {/* Left Column - Metrics */}
          <div className="col-span-1 space-y-4">
            <OverallScore score={mockData.overallScore} />
            
            <MetricsPanel 
              aria={mockData.aria}
              altText={mockData.altText}
              structure={mockData.structure}
            />

            <FilesAnalyzed files={mockData.files} />
          </div>

          {/* Main Screenshot Area */}
          <div className="col-span-4">
            <VisualAnalysis screenshot={mockData.screenshot} />
          </div>
        </div>
      </div>
    </div>
  );
};