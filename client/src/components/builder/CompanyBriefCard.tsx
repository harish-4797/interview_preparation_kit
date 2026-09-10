'use client';

import React, { useState } from 'react';
import { CompanyBrief } from '../../types/kit';
import { Building2, Globe, RefreshCw, Edit3, Check, Pin } from 'lucide-react';

interface CompanyBriefCardProps {
  brief: CompanyBrief;
  onUpdate: (updatedBrief: CompanyBrief) => void;
  onRegenerate: () => Promise<void>;
  isRegenerating?: boolean;
}

export default function CompanyBriefCard({
  brief,
  onUpdate,
  onRegenerate,
  isRegenerating = false,
}: CompanyBriefCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(brief.summary);
  const [whatTheyDo, setWhatTheyDo] = useState(brief.what_they_do);

  const isPinned = brief._meta?.status === 'pinned';

  const handleSave = () => {
    onUpdate({
      ...brief,
      summary,
      what_they_do: whatTheyDo,
      _meta: {
        origin: brief._meta?.origin || 'generated',
        status: isPinned ? 'pinned' : 'edited',
        last_modified: new Date().toISOString(),
      },
    });
    setIsEditing(false);
  };

  const handleTogglePin = () => {
    onUpdate({
      ...brief,
      _meta: {
        origin: brief._meta?.origin || 'generated',
        status: isPinned ? 'edited' : 'pinned',
        last_modified: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Company Brief & Research</h2>
              {brief._meta?.status === 'edited' && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                  Edited
                </span>
              )}
              {isPinned && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center gap-1">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">Autonomous research gathered from crawled web pages</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Unpin brief' : 'Pin brief to prevent overwrites'}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isPinned
                ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Pin className="h-4 w-4" />
          </button>

          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="h-3.5 w-3.5" /> Save Brief
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Inline
            </button>
          )}

          <button
            onClick={onRegenerate}
            disabled={isRegenerating || isPinned}
            title={isPinned ? 'Brief is pinned. Unpin to regenerate.' : 'Regenerate Company Brief'}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRegenerating ? 'Researching...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Executive Summary
          </label>
          {isEditing ? (
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <p className="text-zinc-200 leading-relaxed bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60">
              {brief.summary}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            What They Do & Engineering Context
          </label>
          {isEditing ? (
            <textarea
              value={whatTheyDo}
              onChange={(e) => setWhatTheyDo(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <p className="text-zinc-200 leading-relaxed bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60">
              {brief.what_they_do}
            </p>
          )}
        </div>

        {brief.sources && brief.sources.length > 0 && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Verified Web Sources Used
            </label>
            <div className="flex flex-wrap gap-2">
              {brief.sources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  <span className="truncate max-w-xs">{src}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
