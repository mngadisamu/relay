"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartRow = {
  date: string;
  actual: number | null;
  forecast: number | null;
  base: number | null; // invisible spacer: the low end of the range
  span: number | null; // shaded band: high minus low
};

export default function ForecastChart({ rows, label }: { rows: ChartRow[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            minTickGap={24}
            tick={{ fontSize: 11 }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip />
          <Area dataKey="base" stackId="range" stroke="none" fill="transparent" name=" " isAnimationActive={false} />
          <Area dataKey="span" stackId="range" stroke="none" fill="#bfdbfe" name="Range" isAnimationActive={false} />
          <Line dataKey="actual" name="Actual" stroke="#1f2937" dot={false} connectNulls={false} isAnimationActive={false} />
          <Line
            dataKey="forecast"
            name="Forecast"
            stroke="#2563eb"
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}