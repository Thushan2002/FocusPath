"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatMinutes } from "@focuspath/shared";

const DAY = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekChart({ week }: { week: { date: string; minutes: number; isToday: boolean }[] }) {
  const data = week.map((d, i) => ({ ...d, label: DAY[i], value: Math.max(d.minutes, 3) }));
  const summary = week.map((d) => `${new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })} ${d.minutes}`).join(", ");
  return (
    <div className="h-[130px]" role="img" aria-label={`Study minutes per day: ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#5A6170" }} interval={0} />
          <Tooltip
            cursor={{ fill: "#F5F6F8" }}
            formatter={(_v, _n, item) => [formatMinutes((item.payload as { minutes: number }).minutes), "Studied"]}
            labelFormatter={(_l, p) => (p[0]?.payload as { date?: string } | undefined)?.date ?? ""}
            contentStyle={{ borderRadius: 10, border: "1px solid #E3E6EB", fontSize: 13 }}
          />
          <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.isToday ? "#F5C08A" : d.minutes ? "#0D6E5F" : "#E3E6EB"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
