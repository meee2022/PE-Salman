"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineProps {
  data: { month?: string; value: number }[];
  color?: string;
  height?: number;
}

const MONTH_SHORT: Record<string, string> = {
  "09": "سبت", "10": "أكت", "11": "نوف", "12": "ديس",
  "01": "ينا", "02": "فبر", "03": "مار", "04": "أبر",
  "05": "ماي", "06": "يون",
};

export function MiniSparkline({ data, color = "#7A1E30", height = 44 }: SparklineProps) {
  if (!data.length) return null;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(201,169,110,0.2)",
              borderRadius: 10,
              fontSize: 11,
              fontFamily: "'Cairo', sans-serif",
              padding: "4px 10px",
              boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
            }}
            itemStyle={{ color: "#2A1418", fontWeight: 700 }}
            formatter={(v: number) => [v, ""]}
            labelFormatter={(_, payload) => {
              const month = payload?.[0]?.payload?.month as string | undefined;
              if (!month) return "";
              const mm = month.slice(5, 7);
              return MONTH_SHORT[mm] ?? month;
            }}
            cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
