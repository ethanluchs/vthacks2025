'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to inputform page
    router.replace('/inputform');
  }, [router]);

  // Show a loading spinner while redirecting
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 via-purple-500 to-cyan-400 rounded-lg flex items-center justify-center">
          <div className="relative">
            <div className="w-4 h-2.5 border-2 border-white rounded-full relative">
              <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2">
              <svg viewBox="0 0 8 8" className="w-full h-full fill-white">
                <path d="M1 4 L3 6 L7 2" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
        <span className="text-white font-medium">Loading Karble...</span>
      </div>
    </div>
  );
}