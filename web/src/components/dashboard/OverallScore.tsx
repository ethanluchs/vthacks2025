interface ScoreProps {
  score: number;
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
};

export default function OverallScore({ score }: ScoreProps) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Overall Score</div>
      <div className={`text-3xl font-semibold ${getScoreColor(score)} mb-1`}>
        {score}%
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
}
