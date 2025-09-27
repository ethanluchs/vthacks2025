import { FileText } from 'lucide-react';

interface FilesAnalyzedProps {
  files: string[];
}

export default function FilesAnalyzed({ files }: FilesAnalyzedProps) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Files Analyzed</div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <FileText className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-300">{file}</span>
          </div>
        ))}
      </div>
    </div>
  );
}