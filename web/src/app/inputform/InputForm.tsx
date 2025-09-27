'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InputForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate number of files
    if (selectedFiles.length > 3) {
      setError('Maximum 3 files allowed');
      return;
    }

    const allowedTypes = [
      'text/html',
      'text/css', 
      'text/javascript',
      'application/javascript',
      'text/typescript',
      'application/typescript'
    ];

    const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError('Only HTML, CSS, JavaScript, and TypeScript files are allowed');
      return;
    }

    setError('');
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0 && !url) {
      setError('Please select at least one file or enter a URL');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      if (url) {
        formData.append('url', url);
      }
      files.forEach(file => {
        formData.append('files', file);
      });

      // Call the analysis API
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysisResults = await analyzeResponse.json();
      
      // Store results in sessionStorage (simple approach for hackathon)
      sessionStorage.setItem('analysisResults', JSON.stringify(analysisResults));
      
      // Redirect to dashboard
      router.push('/dashboard');

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-8 text-center">Accessibility Analyzer</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="url-input"
                className="block text-sm font-medium text-zinc-300 mb-3"
              >
                Enter Website URL (Optional)
              </label>
              <input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="block w-full text-sm text-zinc-300
                  bg-zinc-900 border border-zinc-700 rounded-lg p-3
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder-zinc-500"
                disabled={analyzing}
              />
            </div>

            <div>
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-zinc-300 mb-3"
              >
                Or Upload Files (Max 3)
              </label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".html,.css,.js,.ts"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-zinc-300
                    file:mr-4 file:py-3 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-zinc-800 file:text-zinc-300
                    hover:file:bg-zinc-700 file:cursor-pointer
                    bg-zinc-900 border border-zinc-700 rounded-lg p-3"
                  disabled={analyzing}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Accepted file types: HTML, CSS, JavaScript, TypeScript
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
              <p className="text-sm font-medium text-zinc-300 mb-2">Selected files:</p>
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="text-sm text-zinc-400 flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-500 rounded-full"></span>
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={analyzing || (files.length === 0 && !url)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 
              disabled:bg-zinc-700 disabled:cursor-not-allowed
              text-white font-medium rounded-lg transition-colors
              flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              'Analyze Files'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}