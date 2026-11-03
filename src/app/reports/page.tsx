'use client';

import { useState } from 'react';
import ReportPreview from '@/components/reports/ReportPreview';

export default function ReportsPage() {
  const [department, setDepartment] = useState('Finance');
  const [weekStart, setWeekStart] = useState('2026-11-02');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, week_start: weekStart }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setReportData(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto mb-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Department Report Generator</h1>
        
        <form onSubmit={handleGenerateReport} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Week Start (Monday)</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating AI Report...' : 'Generate & Preview Report'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            ⚠️ Error: {error}
          </div>
        )}
      </div>

      {/* Render Preview Component when data is fetched */}
      {reportData ? (
        <ReportPreview 
          department={reportData.department} 
          weekStart={reportData.week_start} 
          reportData={reportData} 
        />
      ) : (
        <div className="max-w-4xl mx-auto text-center py-12 text-slate-400 italic">
          Select a department and week above, then click generate to preview the report.
        </div>
      )}
    </div>
  );
}