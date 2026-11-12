'use client';

import { useState, useEffect } from 'react';
import ReportPreview from '@/components/reports/ReportPreview';

interface ReportData {
  department: string;
  week_start: string;
  metrics?: Record<string, unknown>;
  ai_summary?: string;
  forecast?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SavedReport {
  id: string;
  department: string;
  week_start: string;
  week_end: string;
  created_at: string;
}

export default function ReportsPage() {
  const [department, setDepartment] = useState('Finance');
  const [weekStart, setWeekStart] = useState('2026-11-02');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // S2-29: Saved reports state and fetching
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const fetchSavedReports = async () => {
    try {
      const res = await fetch('/api/reports/list');
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved reports', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedReports();
  }, []);

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

      setReportData(data);
      fetchSavedReports(); // Refresh list after generating
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate report';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, weekStart }),
      });

      if (!response.ok) {
        // Show the server's reason (for example, "Only managers can download reports.")
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relay-${department}-${weekStart}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not download PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Loads a saved report into the preview. Used by both the phone cards and the table.
  const loadSavedReport = async (r: SavedReport) => {
    setDepartment(r.department);
    setWeekStart(r.week_start);
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department: r.department, week_start: r.week_start }),
    });
    const data = await res.json();
    if (res.ok) setReportData(data);
  };

  return (
    <div className="min-h-screen bg-page py-10 px-4 font-sans space-y-8">
      <div className="max-w-4xl mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-line">
        <h1 className="text-xl font-bold text-ink mb-4">Department Report Generator</h1>
        
        <form onSubmit={handleGenerateReport} className="flex flex-wrap gap-4 items-end">
          <div>
            <label htmlFor="department" className="block text-xs font-semibold uppercase text-ink-2 mb-1">Department</label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="border border-field rounded-md p-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div>
            <label htmlFor="week-start" className="block text-xs font-semibold uppercase text-ink-2 mb-1">Week Start (Monday)</label>
            <input
              id="week-start"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="border border-field rounded-md p-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-brand hover:bg-brand-dark text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Preview report'}
          </button>

          {reportData && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          )}
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            ⚠️ Error: {error}
          </div>
        )}
      </div>

      {/* Render Preview Component when data is fetched */}
      {reportData ? (
        <div className="max-w-4xl mx-auto">
          <ReportPreview 
            department={reportData.department} 
            weekStart={reportData.week_start} 
            reportData={reportData as unknown as Parameters<typeof ReportPreview>[0]['reportData']} 
          />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto text-center py-6 text-muted italic">
          Select a department and week above, then click generate to preview the report.
        </div>
      )}

      {/* S2-29: Saved Reports List Section */}
      <div className="max-w-4xl mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-line">
        <h2 className="text-lg font-bold text-ink mb-4">Saved Reports</h2>
        
        {loadingSaved ? (
          <p className="text-sm text-muted">Loading saved reports...</p>
        ) : savedReports.length === 0 ? (
          <p className="text-sm text-muted">No saved reports found.</p>
        ) : (
          <>
            {/* Phones: one card per saved report (the table is too wide for 360 px) */}
            <ul className="space-y-3 md:hidden">
              {savedReports.map((r) => (
                <li key={r.id} className="space-y-3 rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{r.department}</p>
                      <p className="text-sm text-ink-2">{r.week_start} to {r.week_end}</p>
                    </div>
                    <p className="text-xs text-muted">Generated {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button type="button" onClick={() => loadSavedReport(r)} className="text-sm font-medium text-brand hover:underline">
                      Load Preview
                    </button>
                    <a
                      href={`/api/reports/pdf?department=${r.department}&week_start=${r.week_start}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-emerald-600 hover:underline"
                    >
                      PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet and desktop: the table */}
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-line bg-page text-ink-2">
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Week Period</th>
                  <th className="p-3 font-semibold">Generated On</th>
                  <th className="p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {savedReports.map((r) => (
                  <tr key={r.id} className="border-b border-line-soft hover:bg-page transition-colors">
                    <td className="p-3 font-medium text-ink">{r.department}</td>
                    <td className="p-3 text-ink-2">{r.week_start} to {r.week_end}</td>
                    <td className="p-3 text-ink-2">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => loadSavedReport(r)}
                        className="text-brand hover:underline font-medium text-xs mr-4"
                      >
                        Load Preview
                      </button>
                      <a
                        href={`/api/reports/pdf?department=${r.department}&week_start=${r.week_start}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline font-medium text-xs"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}