'use client';

interface DashboardHeaderProps {
  filesCount: number;
  issuesCount: number;
  completedAt: Date;
}

export default function DashboardHeader({ filesCount, issuesCount }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold mb-3">Accessibility Report</h1>
      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span>{filesCount} files analyzed</span>
        <span>•</span>
        <span>{issuesCount} issues found</span>
        <span>•</span>
      </div>
    </div>
  );
}