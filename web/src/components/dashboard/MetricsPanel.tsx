interface MetricProps {
  name: string;
  score: number;
  issues: number;
  color: string;
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
};

function MetricCard({ name, score, issues, color }: MetricProps) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }}></div>
        <div className="text-sm font-medium">{name}</div>
      </div>
      <div className={`text-xl font-semibold ${getScoreColor(score)} mb-1`}>
        {score}%
      </div>
      <div className="text-xs text-zinc-500">{issues} issues found</div>
    </div>
  );
}

interface MetricsPanelProps {
  aria: { score: number; issues: number };
  altText: { score: number; issues: number };
  structure: { score: number; issues: number };
}

export default function MetricsPanel({ aria, altText, structure }: MetricsPanelProps) {
  return (
    <div className="space-y-4">
      <MetricCard
        name="ARIA Labels"
        score={aria.score}
        issues={aria.issues}
        color="#3B82F6" // blue-500
      />
      <MetricCard
        name="Alt Text"
        score={altText.score}
        issues={altText.issues}
        color="#10B981" // emerald-500
      />
      <MetricCard
        name="Structure"
        score={structure.score}
        issues={structure.issues}
        color="#8B5CF6" // violet-500
      />
    </div>
  );
}