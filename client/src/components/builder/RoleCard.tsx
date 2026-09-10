'use client';

import React from 'react';
import { Role } from '../../types/kit';
import { Briefcase, CheckCircle, Star } from 'lucide-react';

interface RoleCardProps {
  role: Role;
  onUpdate?: (updatedRole: Role) => void;
}

export default function RoleCard({ role }: RoleCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{role.title}</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-zinc-800 text-zinc-300 rounded-md">
              {role.seniority}
            </span>
          </div>
          <p className="text-xs text-zinc-400">Extracted role profile and prioritized requirements</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Responsibilities */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Core Responsibilities
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {role.responsibilities.map((resp, idx) => (
              <li key={idx} className="flex items-start gap-2.5 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60">
                <CheckCircle className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{resp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Structured Requirements ({role.requirements.length})</span>
            <span className="text-[11px] text-zinc-500 font-normal">
              {role.requirements.filter((r) => r.priority === 'must').length} must-haves
            </span>
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {role.requirements.map((req) => {
              const isMust = req.priority === 'must';
              return (
                <div
                  key={req.id}
                  className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-zinc-400">{req.id}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isMust
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {req.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/80 text-zinc-300 capitalize">
                        {req.kind}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-200 text-xs leading-relaxed">{req.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
