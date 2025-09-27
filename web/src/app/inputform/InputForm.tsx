'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InputForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);
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
    
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // First analyze the files
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed. Please try again.');
      }

      // Redirect to loading page
      router.push('/loading');

      // Clear form
      setFiles([]);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="file-upload"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Upload Files (Max 3)
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".html,.css,.js,.ts"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={uploading}
        />
        <p className="mt-1 text-sm text-gray-500">
          Accepted file types: HTML, CSS, JavaScript, TypeScript
        </p>
      </div>

      {error && (
        <p className={`text-sm ${error.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-700">Selected files:</p>
          <ul className="mt-1 text-sm text-gray-500">
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || files.length === 0}
        className="inline-flex justify-center py-2 px-4 border border-transparent 
          shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 
          hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
          focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
