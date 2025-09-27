'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Silk from '../../components/Silk';

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

      // Add URL if provided (use exact field name expected by backend)
      if (url && url.trim()) {
        formData.append('url', url.trim());
        console.log('Added URL to FormData:', url);
      }

      // Add files if provided (use exact field name expected by backend)
      if (files.length > 0) {
        files.forEach((file, index) => {
          formData.append('files', file);  // This must match the backend parameter name
          console.log(`Added file ${index}:`, file.name, file.type, `${file.size} bytes`);
        });
      }

      // Log FormData contents for debugging
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(key, `File: ${value.name} (${value.size} bytes)`);
        } else {
          console.log(key, value);
        }
      }

      console.log('Sending request to /api/analyze...');

      // Call the analysis API
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      console.log('Response status:', analyzeResponse.status);
      console.log('Response headers:', Object.fromEntries(analyzeResponse.headers.entries()));

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error('Error response text:', errorText);

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.detail || 'Analysis failed');
        } catch (parseError) {
          // If response is not JSON, show the raw text
          throw new Error(`HTTP ${analyzeResponse.status}: ${errorText}`);
        }
      }

      const analysisResults = await analyzeResponse.json();
      console.log('Analysis results:', analysisResults);

      // Store results in sessionStorage for dashboard display
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
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* Silk Background */}
      <div className="absolute inset-0 z-0">
        <Silk
          speed={2}
          scale={1.8}
          color="#0f0f23"
          noiseIntensity={1.3}
          rotation={0.1}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full">

          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-center text-transparent">
            Accessibility Analyzer
          </h1>


          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-8 shadow-2xl ring-1 ring-white/10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-8">
                {/* URL Input Section */}
                <div className="group">
                  <label
                    htmlFor="url-input"
                    className="flex items-center gap-3 text-sm font-medium text-zinc-300 mb-4"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    Enter Website URL
                  </label>
                  <div className="relative">
                    <input
                      id="url-input"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="block w-full text-sm text-zinc-100
                      bg-zinc-800/70 backdrop-blur-sm border border-zinc-600/50 rounded-xl p-4 pl-12
                      focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50
                      focus:bg-zinc-800/90
                      placeholder-zinc-400 transition-all duration-200
                      hover:border-zinc-500/70 ring-1 ring-white/5"
                      disabled={analyzing}
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-1.657 0-3.157-.672-4.243-1.757M12 21a9 9 0 009-9m-9 9c1.657 0 3.157-.672 4.243-1.757M3 12a9 9 0 019-9m-9 9a9 9 0 019 9m-9-9c1.657 0 3.157.672 4.243 1.757" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="group">
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-3 text-sm font-medium text-zinc-300 mb-4"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-lg">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    Upload Files (Max 3)
                  </label>
                  <div className="relative">
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".html,.css,.js,.ts"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-black-300
                      file:mr-4 file:py-3 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-medium
                      file:bg-gradient-to-r file:from-green-500/20 file:to-black-500/20
                      file:text-black-300 hover:file:from-green-500/30 hover:file:to-blue-500/30
                      file:cursor-pointer file:transition-all file:duration-200
                      bg-zinc-800/50 border border-zinc-700 border-dashed rounded-xl p-4
                      hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200"
                      disabled={analyzing}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Accepted: HTML, CSS, JavaScript, TypeScript
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}

              {/* File Preview */}
              {files.length > 0 && (
                <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-green-300">
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="text-sm text-zinc-300 flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg">
                        <div className="flex-shrink-0">
                          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-zinc-500 ml-auto">
                          {(file.size / 1024).toFixed(1)}KB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={analyzing || (files.length === 0 && !url)}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 
                hover:from-blue-700 hover:to-purple-700 
                disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed
                text-white font-semibold rounded-xl transition-all duration-200
                flex items-center justify-center gap-3 shadow-lg
                hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                disabled:hover:scale-100 disabled:shadow-none"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Analyzing your files...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Start Analysis</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}