"use client";

// Lazy-loaded chart primitives. Kept in one file so recharts is only pulled in
// on the screens that actually draw charts (dashboard, finance, hr, marketing).

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const INK = "#0B1220";
const BRAND = "#E10600";
const MUTED = "#5B6575";
const LINE = "#E3E7ED";
const BLUE = "#0EA5E9";

const AXIS = {
  stroke: LINE,
  tick: { fill: MUTED, fontSize: 11 },
};

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: `1px solid ${LINE}`,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(11,18,32,0.08)",
};

export function RevenueTrendChart({
  data,
  label = "Revenue",
  unit = "₵",
}: {
  data: { label: string; value: number }[];
  label?: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
        <XAxis dataKey="label" {...AXIS} axisLine={false} tickLine={false} />
        <YAxis
          {...AXIS}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(value: number) => `${unit}${Math.round(value / 1000)}k`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`${unit}${Number(value).toLocaleString()}`, label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  label = "Bookings",
  unit = "",
  color = INK,
  horizontal = false,
}: {
  data: { label: string; value: number }[];
  label?: string;
  unit?: string;
  color?: string;
  horizontal?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        layout={horizontal ? "vertical" : "horizontal"}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              {...AXIS}
              axisLine={false}
              tickLine={false}
              width={110}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...AXIS} axisLine={false} tickLine={false} />
            <YAxis {...AXIS} axisLine={false} tickLine={false} width={48} />
          </>
        )}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`${unit}${Number(value).toLocaleString()}`, label]}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 6, 6]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SplitBarChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
        <XAxis dataKey="label" {...AXIS} axisLine={false} tickLine={false} />
        <YAxis {...AXIS} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => `₵${Math.round(v / 1000)}k`} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={item.color}
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color?: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
        <XAxis dataKey="label" {...AXIS} axisLine={false} tickLine={false} />
        <YAxis {...AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
        {series.map((item, index) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color ?? (index === 0 ? BRAND : BLUE)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

const PIE_COLOURS = [BRAND, INK, BLUE, "#F59E0B", "#10B981", "#8B5CF6"];

export function ShareDonutChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={PIE_COLOURS[index % PIE_COLOURS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
