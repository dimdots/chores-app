"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";

export type WeeklyChartPoint = { date: string; points: number; label: string };

export function WeeklyChart({
  title,
  data,
}: {
  title: string;
  data: WeeklyChartPoint[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">{t.reports.noData}</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(76,95,240,0.08)" }} />
                <Bar dataKey="points" fill="#4c5ff0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
