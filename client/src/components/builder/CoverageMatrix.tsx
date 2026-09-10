'use client';

import React from 'react';
import { Coverage, Requirement, Question } from '../../types/kit';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface CoverageMatrixProps {
  coverage: Coverage;
  requirements: Requirement[];
  questions: Question[];
}

export default function CoverageMatrix({ coverage, requirements, questions }: CoverageMatrixProps) {
  // Map requirement ID to questions addressing it
  const reqQuestionMap = new Map<string, Question[]>();
  for (const r of requirements) {
    reqQuestionMap.set(r.id, []);
  }
  for (const q of questions) {
    for (const rid of q.requirement_ids) {
      const existing = reqQuestionMap.get(rid) || [];
      existing.push(q);
      reqQuestionMap.set(rid, existing);
    }
  }

  const uncoveredSet = new Set(coverage.uncovered_requirement_ids);
  const mustHaveCount = requirements.filter((r) => r.priority === 'must').length;
  const mustHavesCovered = requirements
    .filter((r) => r.priority === 'must')
    .every((r) => !uncoveredSet.has(r.id));

  return (
    <div className="space-y-6">
      {/* Coverage Status Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center border ${
              mustHavesCovered
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            {mustHavesCovered ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Requirement Coverage Matrix</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-300">
                {coverage.passes} {coverage.passes === 1 ? 'Pass' : 'Passes'} Run
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Deterministic code verification linking extracted JD requirements to generated interview questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Must-Haves</div>
            <div className="font-bold text-emerald-400">{mustHaveCount}/{mustHaveCount} Covered</div>
          </div>
          <div className="bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Uncovered</div>
            <div className={`font-bold ${coverage.uncovered_requirement_ids.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {coverage.uncovered_requirement_ids.length}
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 pl-5">Status</th>
                <th className="p-3.5">Req ID</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Kind</th>
                <th className="p-3.5 w-1/3">Requirement Text</th>
                <th className="p-3.5 pr-5">Covering Questions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {requirements.map((req) => {
                const coveringQs = reqQuestionMap.get(req.id) || [];
                const isCovered = coveringQs.length > 0;
                const isMust = req.priority === 'must';

                return (
                  <tr key={req.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3.5 pl-5">
                      {isCovered ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-zinc-300">{req.id}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isMust
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {req.priority}
                      </span>
                    </td>
                    <td className="p-3.5 capitalize text-zinc-400">{req.kind}</td>
                    <td className="p-3.5 text-zinc-200 leading-relaxed">{req.text}</td>
                    <td className="p-3.5 pr-5">
                      {coveringQs.length === 0 ? (
                        <span className="text-zinc-500 italic">No questions assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {coveringQs.map((q) => (
                            <span
                              key={q.id}
                              title={q.prompt}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] cursor-default"
                            >
                              {q.id} ({q.category})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
