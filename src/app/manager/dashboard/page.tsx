import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TrendCharts from "./TrendCharts";

// Dashboard (S2-14): four number cards and filters. The numbers come from the
// database function dashboard_metrics() (see docs/metrics.md). The filters live
// in the URL, so a filtered view can be shared or bookmarked.

type Change = {
  value: number | null;
  previous: number | null;
  change_pct: number | null;
};

type Metrics = {
  period: { from: string; to: string; days: number };
  department: string | null;
  cards: {
    tickets: Change;
    first_reply_hours: Change & { based_on: number };
    open_tickets: Change;
    needs_review: {
      value: number | null;
      previous: number | null;
      change_points: number | null;
      count: number;
    };
  };
  // For the charts (S2-18), from the same dashboard_metrics() call.
  weekly?: { week_start: string; tickets: number }[];
  by_department?: { department: string; tickets: number }[];
};

type Search = { department?: string; from?: string; to?: string };

const DEPARTMENTS = ["IT", "HR", "Finance", "Operations"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = "Africa/Johannesburg";
const FEW_TICKETS = 20;

// Today's date in South African time, as YYYY-MM-DD
function todaySast() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function niceDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const show = (n: number | null) => (n === null ? "No data" : String(n));

// The change line. The arrow is decoration only: the words carry the meaning,
// so it never relies on colour alone.
function Delta({ amount, suffix }: { amount: number | null; suffix: string }) {
       if (amount === null) return <>No comparison available for the previous period</>;
  if (amount === 0) return <>No change since the previous period</>;
  const up = amount > 0;
  return (
    <>
      <span aria-hidden="true">{up ? "▲" : "▼"} </span>
      {Math.abs(amount)}
      {suffix} {up ? "higher" : "lower"} than the previous period
    </>
  );
}

function MetricCard({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Card className="h-full">
        <CardContent className="space-y-2 p-5">
          <h2 className="text-sm font-medium text-ink-2">{label}</h2>
          <p className="text-3xl font-semibold text-ink">{value}</p>
          <p className="text-sm text-ink-2">{children}</p>
          {note ? <p className="text-xs text-ink-2">{note}</p> : null}
        </CardContent>
      </Card>
    </li>
  );
}

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  // Only managers may open this page; everyone else goes to their own home.
  const profile = await requireRole(["manager"]);
  const sp = await searchParams;

  // Filters from the URL, with safe defaults: the last 30 days, all departments.
  const today = todaySast();
  const defaultFrom = addDays(today, -29);
  let from = sp.from && DATE.test(sp.from) ? sp.from : defaultFrom;
  let to = sp.to && DATE.test(sp.to) ? sp.to : today;
  let notice: string | null = null;
  if (from > to) {
    notice = "The From date was after the To date, so the last 30 days are shown instead.";
    from = defaultFrom;
    to = today;
  }
  const department = DEPARTMENTS.find((d) => d === sp.department) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_metrics", {
    p_from: from,
    p_to: to,
    p_department: department,
  });
  const metrics = error ? null : (data as Metrics | null);

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} />
      <main className="mx-auto max-w-[1360px] space-y-6 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-[15px] text-ink-2">
            {department ?? "All departments"} · {niceDate(from)} to {niceDate(to)}
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            {/* key: remounts the form when the filters change, so Reset clears the fields */}
            <form
              key={`${department}-${from}-${to}`}
              method="get"
              action="/manager/dashboard"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
            >
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  name="department"
                  defaultValue={department ?? ""}
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input id="from" name="from" type="date" defaultValue={from} max={today} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" name="to" type="date" defaultValue={to} max={today} />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit">Apply filters</Button>
                <Link
                  href="/manager/dashboard"
                  className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-ink underline underline-offset-4"
                >
                  Reset
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {notice ? (
          <p role="status" className="text-sm text-ink-2">
            {notice}
          </p>
        ) : null}

        {!metrics ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            The numbers could not be loaded{error ? `: ${error.message}` : ""}. Try
            again, and tell the team if it keeps happening.
          </p>
        ) : (
          <>
            {metrics.cards.tickets.value === 0 ? (
              <p className="rounded-md border border-input bg-white p-3 text-sm text-ink-2">
                No tickets in this period. Try a longer period or another department.
              </p>
            ) : (metrics.cards.tickets.value ?? 0) < FEW_TICKETS ? (
              <p className="rounded-md border border-input bg-white p-3 text-sm text-ink-2">
                Only {metrics.cards.tickets.value} tickets in this period, so the changes
                can look bigger than they are.
              </p>
            ) : null}

            <ul aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Tickets" value={show(metrics.cards.tickets.value)}>
                <Delta amount={metrics.cards.tickets.change_pct} suffix="%" />
              </MetricCard>

              <MetricCard
                label="Average hours to first reply"
                value={
                  metrics.cards.first_reply_hours.value === null
                    ? "No data"
                    : `${metrics.cards.first_reply_hours.value} h`
                }
                note={`Based on ${metrics.cards.first_reply_hours.based_on} answered tickets`}
              >
                <Delta amount={metrics.cards.first_reply_hours.change_pct} suffix="%" />
              </MetricCard>

              <MetricCard label="Open tickets" value={show(metrics.cards.open_tickets.value)}>
                <Delta amount={metrics.cards.open_tickets.change_pct} suffix="%" />
              </MetricCard>

              <MetricCard
                label="Needing review"
                value={
                  metrics.cards.needs_review.value === null
                    ? "No data"
                    : `${metrics.cards.needs_review.value}%`
                }
                note={`${metrics.cards.needs_review.count} tickets`}
              >
                <Delta amount={metrics.cards.needs_review.change_points} suffix=" points" />
              </MetricCard>
            </ul>

            <TrendCharts weekly={metrics.weekly ?? []} departments={metrics.by_department ?? []} />

            <p className="text-xs text-ink-2">
              Changes compare with the previous {metrics.period.days} days.
            </p>
          </>
        )}
      </main>
    </div>
  );
}