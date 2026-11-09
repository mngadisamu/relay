"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

// Charts for the manager dashboard (S2-18). The numbers come from
// dashboard_metrics() (see docs/metrics.md): `weekly` and `by_department`.
// Each chart has a text summary and a table, so nobody depends on seeing it.

type Week = { week_start: string; tickets: number };
type Dept = { department: string; tickets: number };

const BRAND = "#0f5fb8";
const GRID = "#dde1e6";
const TEXT = "#59626e";

const short = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function weeklySummary(weeks: Week[]) {
  if (weeks.length === 0) return "There is no weekly data for this view.";
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const peak = weeks.reduce((a, b) => (b.tickets > a.tickets ? b : a));
  const move =
    last.tickets === first.tickets
      ? `stayed at ${first.tickets} a week`
      : `${last.tickets > first.tickets ? "rose" : "fell"} from ${first.tickets} to ${last.tickets} a week`;
  return `Over the last ${weeks.length} weeks, tickets ${move}. The busiest week was the week of ${short(peak.week_start)}, with ${peak.tickets} tickets. The latest week may not be finished yet.`;
}

function departmentSummary(depts: Dept[]) {
  if (depts.length === 0) return "There are no tickets in this period.";
  if (depts.length === 1)
    return `Showing ${depts[0].department} only: ${depts[0].tickets} tickets in this period.`;
  return `Tickets by department in this period: ${depts
    .map((d) => `${d.department} ${d.tickets}`)
    .join(", ")}.`;
}

function NumbersTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string;
  rows: { label: string; tickets: number }[];
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-ink underline underline-offset-4">
        Show the numbers
      </summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="py-1 pr-4 font-medium text-ink-2">
              {head}
            </th>
            <th scope="col" className="py-1 font-medium text-ink-2">
              Tickets
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-1 pr-4 text-ink">{r.label}</td>
              <td className="py-1 text-ink">{r.tickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function ChartCard({
  title,
  summary,
  table,
  children,
}: {
  title: string;
  summary: string;
  table: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {/* The drawing is hidden from screen readers; the summary below replaces it. */}
        <div aria-hidden="true" className="h-64 w-full">
          {children}
        </div>
        <p className="text-sm text-ink-2">{summary}</p>
        {table}
      </CardContent>
    </Card>
  );
}

const axisText = { fill: TEXT, fontSize: 12 };

export default function TrendCharts({
  weekly,
  departments,
}: {
  weekly: Week[];
  departments: Dept[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Tickets per week (last 12 weeks)"
        summary={weeklySummary(weekly)}
        table={
          <NumbersTable
            caption="Tickets per week"
            head="Week starting"
            rows={weekly.map((w) => ({ label: short(w.week_start), tickets: w.tickets }))}
          />
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={weekly}
            margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
            accessibilityLayer={false}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="week_start"
              tickFormatter={short}
              tick={axisText}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={axisText} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(v) => `Week of ${short(String(v))}`} />
            <Line
              type="monotone"
              dataKey="tickets"
              name="Tickets"
              stroke={BRAND}
              strokeWidth={2.5}
              dot={{ r: 3, fill: BRAND }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Tickets by department"
        summary={departmentSummary(departments)}
        table={
          <NumbersTable
            caption="Tickets by department"
            head="Department"
            rows={departments.map((d) => ({ label: d.department, tickets: d.tickets }))}
          />
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={departments}
            margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
            accessibilityLayer={false}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="department"
              tick={axisText}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <YAxis allowDecimals={false} tick={axisText} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "#eef1f5" }} />
            <Bar
              dataKey="tickets"
              name="Tickets"
              fill={BRAND}
              radius={[4, 4, 0, 0]}
              maxBarSize={64}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}