'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import ProgressModal from '../../components/generation/ProgressModal';
import {
  Sparkles,
  Building,
  Calendar,
  FileText,
  UploadCloud,
  FileUp,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function NewKitPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Generation Modal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const presetDays = [1, 3, 5, 7, 14, 30];

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd.trim() || !companyUrl.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setCurrentStep(1);

    // Simulate progressive step increments while backend executes
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < 10 ? prev + 1 : prev));
    }, 1200);

    try {
      const result = await api.generateKit(jd.trim(), companyUrl.trim(), days);
      clearInterval(stepTimer);
      setCurrentStep(11);
      setTimeout(() => {
        router.push(`/kit/${result.id}`);
      }, 600);
    } catch (err: any) {
      clearInterval(stepTimer);
      setGenerationError(err.message || 'Kit generation failed.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBatchError(null);
    setBatchFile(file);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Uploaded file must contain a JSON array of roles.');
        }

        // Fill in the first role from the file for immediate generation
        const first = parsed[0];
        if (first.jd) setJd(first.jd);
        if (first.company_url) setCompanyUrl(first.company_url);
        if (first.days) setDays(first.days);
      } catch (err: any) {
        setBatchError(`Invalid JSON format: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-2">
          <Sparkles className="h-3 w-3" />
          <span>New Preparation Kit Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Create an Interview Prep Kit
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Provide the job description and company URL. The autonomous pipeline will research the company,
          analyze the hiring process, and engineer your tailored study kit.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl max-w-xs text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            mode === 'single'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Single Role
        </button>
        <button
          type="button"
          onClick={() => setMode('batch')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            mode === 'batch'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Batch File Upload
        </button>
      </div>

      {/* Batch Upload Area */}
      {mode === 'batch' && (
        <div className="bg-zinc-900 border border-dashed border-zinc-700 hover:border-indigo-500 rounded-3xl p-8 text-center transition-colors">
          <UploadCloud className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Upload Description & Company Pairs</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            Upload a JSON file containing an array of cases matching the format:
            <code className="block mt-1 font-mono text-[11px] text-zinc-300 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
              [{`{ "jd": "...", "company_url": "https://...", "days": 5 }`}]
            </code>
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors">
            <FileUp className="h-4 w-4 text-indigo-400" />
            <span>Select JSON File</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          {batchFile && (
            <p className="mt-3 text-xs text-emerald-400">
              Loaded "{batchFile.name}". First role populated below.
            </p>
          )}

          {batchError && (
            <p className="mt-3 text-xs text-rose-400 flex items-center justify-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{batchError}</span>
            </p>
          )}
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSingleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Job Description */}
        <div>
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>Job Description Text</span>
          </label>
          <textarea
            required
            rows={8}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description text here (responsibilities, required qualifications, nice-to-haves, tech stack)..."
            className="w-full rounded-2xl bg-zinc-950 border border-zinc-700 p-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
          <span className="text-[11px] text-zinc-500 mt-1 block">
            {jd.length} characters • All requirements will be extracted without hallucination
          </span>
        </div>

        {/* Company Website URL */}
        <div>
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Building className="h-4 w-4 text-indigo-400" />
            <span>Company Website URL</span>
          </label>
          <input
            type="url"
            required
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            placeholder="https://company.com"
            className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
          />
          <span className="text-[11px] text-zinc-500 mt-1 block">
            The crawler will discover hiring, engineering, and interview pages starting from this URL.
          </span>
        </div>

        {/* Days Available Before Interview */}
        <div>
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>Days Available Before Interview</span>
          </label>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {presetDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {d} {d === 1 ? 'Day' : 'Days'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 max-w-xs">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-xs text-zinc-400">Custom Days:</span>
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-center text-white focus:outline-none focus:border-indigo-500 font-bold"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Interview Prep Kit</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Live Generation Progress Modal */}
      <ProgressModal
        isOpen={isGenerating}
        currentStep={currentStep}
        error={generationError}
        onRetry={handleSingleSubmit as any}
        onCancel={() => setIsGenerating(false)}
      />
    </div>
  );
}
