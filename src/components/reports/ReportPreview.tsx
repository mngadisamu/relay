'use client';

import React from 'react';
import Link from 'next/link';
import { AiNote } from '@/components/AiNote';

interface ReportPreviewProps {
  department: string;
  weekStart: string;
  reportData: {
    metrics: {
      cards?: {
        tickets: { value: number; previous: number; change_pct: number };
        first_reply_hours: { value: number; previous: number; change_pct: number };
        open_tickets: { value: number; previous: number; change_pct: number };
        needs_review: { value: number; count: number };
      };
      resolution_hours?: { value: number; previous: number };
    };
    ai_summary: string | null;
    forecast: {
      projection?: string;
      range?: string;
      callout?: string;
      days?: Array<{ date: string; expected: number; low?: number; high?: number }>;
    };
    oldest_tickets?: Array<{
      reference: string;
      subject: string;
      age_days: number;
    }>;
  };
}

export default function ReportPreview({ department, weekStart, reportData }: ReportPreviewProps) {
  // The report covers Monday to the Sunday after (the same period the summary must cover).
  const periodEnd = (() => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const cards = reportData?.metrics?.cards;

  return (
    <div className="max-w-4xl mx-auto bg-white border border-line shadow-sm rounded-lg p-8 font-sans text-ink">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-line pb-6 mb-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-brand uppercase">Kopano Freight Relay</span>
          <h1 className="text-2xl font-bold text-ink">Weekly Department Report</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-ink-2">Department: <span className="text-ink font-semibold">{department}</span></p>
          <p className="text-sm text-muted">Week of: {weekStart}</p>
        </div>
      </div>

      {/* SECTION 1: WEEKLY PERFORMANCE SUMMARY (KPIs) */}
      <div className="mb-8">
        <h2 className="text-sm font-bold tracking-wider text-muted uppercase mb-4">Section 1: Weekly Performance Summary (KPIs)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-page border border-line-soft p-4 rounded-md">
            <p className="text-xs font-medium text-muted uppercase">Total Tickets</p>
            <p className="text-2xl font-bold text-ink mt-1">{cards?.tickets?.value ?? '—'}</p>
            <p className="text-xs text-ink-2 mt-1">vs prev: {cards?.tickets?.change_pct ?? 0}%</p>
          </div>

          <div className="bg-page border border-line-soft p-4 rounded-md">
            <p className="text-xs font-medium text-muted uppercase">Avg Response Time</p>
            <p className="text-2xl font-bold text-ink mt-1">{cards?.first_reply_hours?.value ?? '—'} hrs</p>
            <p className="text-xs text-ink-2 mt-1">vs prev: {cards?.first_reply_hours?.change_pct ?? 0}%</p>
          </div>

          <div className="bg-page border border-line-soft p-4 rounded-md">
            <p className="text-xs font-medium text-muted uppercase">Open Tickets</p>
            <p className="text-2xl font-bold text-ink mt-1">{cards?.open_tickets?.value ?? '—'}</p>
            <p className="text-xs text-ink-2 mt-1">Needing review: {cards?.needs_review?.count ?? 0}</p>
          </div>

        </div>
      </div>

      {/* SECTION 2: AI INSIGHTS & SUMMARY */}
      <div className="mb-8">
        <h2 className="text-sm font-bold tracking-wider text-muted uppercase mb-4">Section 2: AI Insights & Summary</h2>
        <div className="bg-page border-l-4 border-brand p-4 rounded-r-md">
          {/* The summary is the one saved on the dashboard for this department and week
              (S2-28). Say plainly when there isn't one, rather than showing an AI label
              on text the AI didn't write. */}
          {reportData?.ai_summary ? (
            <>
              <p className="text-ink-2 italic leading-relaxed">&ldquo;{reportData.ai_summary}&rdquo;</p>
              <div className="mt-3">
                <AiNote kind="summary" />
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-2">
              No AI summary is saved for {department} from {weekStart} to {periodEnd}.{' '}
              <Link
                prefetch
                href={`/manager/dashboard?department=${encodeURIComponent(department)}&from=${weekStart}&to=${periodEnd}`}
                className="font-semibold text-brand-dark underline"
              >
                Write it on the dashboard
              </Link>
              , then generate the report again.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 3: 4-WEEK WORKLOAD FORECAST */}
      <div className="mb-8">
        <h2 className="text-sm font-bold tracking-wider text-muted uppercase mb-4">Section 3: 4-Week Workload Forecast</h2>
        <div className="bg-page border border-line-soft p-4 rounded-md">
          <p className="text-sm text-ink-2">{reportData?.forecast?.projection || 'No forecast is available for this report.'}</p>
          {(reportData?.forecast?.days?.length ?? 0) > 0 && (
            <ul className="mt-3 space-y-2 text-sm">
              {[0, 1, 2, 3]
                .map((w) => reportData.forecast.days!.slice(w * 7, w * 7 + 7))
                .filter((days) => days.length > 0)
                .map((days, w) => {
                  const avg = (f: (d: (typeof days)[number]) => number) =>
                    (days.reduce((sum, d) => sum + f(d), 0) / days.length).toFixed(1);
                  return (
                    <li key={w} className="flex flex-wrap justify-between gap-2 border-t border-line-soft pt-2">
                      <span className="font-medium text-ink">Week {w + 1}: {days[0].date} to {days[days.length - 1].date}</span>
                      <span className="text-ink-2">
                        {avg((d) => d.expected)} a day (range {avg((d) => d.low ?? d.expected)} to {avg((d) => d.high ?? d.expected)})
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
          {reportData?.forecast?.callout && (
            <div className="mt-2 text-xs font-semibold text-brand-dark bg-brand-soft p-2 rounded">
              💡 {reportData.forecast.callout}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: OLDEST UNRESOLVED TICKETS (TOP 5) */}
      <div className="mb-8">
        <h2 className="text-sm font-bold tracking-wider text-muted uppercase mb-4">Section 4: Oldest Unresolved Tickets (Top 5)</h2>
        <div className="border border-line rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-page text-ink-2 text-xs uppercase tracking-wider">
                <th className="p-3 font-semibold">Reference</th>
                <th className="p-3 font-semibold">Subject</th>
                <th className="p-3 font-semibold text-right">Age (Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {reportData?.oldest_tickets && reportData.oldest_tickets.length > 0 ? (
                reportData.oldest_tickets.map((ticket, index) => (
                  <tr key={index} className="hover:bg-page">
                    <td className="p-3 font-mono text-xs text-ink-2">{ticket.reference}</td>
                    <td className="p-3 text-ink">{ticket.subject}</td>
                    <td className="p-3 text-right text-ink-2">{ticket.age_days} days</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted italic">No unresolved tickets for this department.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-line pt-4 text-center text-xs text-muted">
        Relay Internal System Report · Confidential · Generated in SAST
      </div>

    </div>
  );
}