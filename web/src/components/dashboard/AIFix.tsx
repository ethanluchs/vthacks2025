"use client";

import React, { useState } from 'react';

export default function AIFix() {
  const tabs = ['ARIA Labels', 'Alt Text', 'Structure'];
  const [active, setActive] = useState<number>(0);
  const [selectedIssue, setSelectedIssue] = useState<string>('');

  // Placeholder issues - to be replaced with real data later
  const issues = [
    { id: 'aria_missing_label', label: 'Missing ARIA label' },
    { id: 'img_no_alt', label: 'Image missing alt text' },
    { id: 'nesting_issue', label: 'Improper HTML nesting' }
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg">
      {/* Tabs header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActive(i)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none ${
              i === active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
            }`}
            aria-pressed={i === active}
            aria-label={`Show ${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="p-6">
        {/* Controls: Issue dropdown + Generate button */}
        <div className="flex items-center gap-3 mb-4">
          <label className="sr-only" htmlFor="aifix-issue">Issue</label>
          <div className="flex-1">
            <select
              id="aifix-issue"
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 p-2 rounded-md"
            >
              <option value="">Select an issue...</option>
              {issues.map((it) => (
                <option key={it.id} value={it.id}>{it.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              // TODO: hook up AI generation action
              console.log('Generate fix for', selectedIssue);
            }}
            disabled={!selectedIssue}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedIssue ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            Generate Fix
          </button>
        </div>
        {active === 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white">AI Fix — ARIA Labels</h3>
            <p className="text-sm text-zinc-400 mt-2">Placeholder content for ARIA label fixes.</p>
          </div>
        )}

        {active === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-white">AI Fix — Alt Text</h3>
            <p className="text-sm text-zinc-400 mt-2">Placeholder content for alt text suggestions.</p>
          </div>
        )}

        {active === 2 && (
          <div>
            <h3 className="text-lg font-semibold text-white">AI Fix — Structure</h3>
            <p className="text-sm text-zinc-400 mt-2">Placeholder content for structure recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
