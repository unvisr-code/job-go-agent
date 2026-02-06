'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyStats } from '@/types';

interface MonthlyChartProps {
  data: MonthlyStats[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  // 월 포맷팅 (YYYY-MM -> M월)
  const chartData = data.map((item) => {
    const [year, month] = item.month.split('-');
    return {
      ...item,
      label: `${parseInt(month)}월`,
      fullLabel: `${year}.${month}`,
    };
  });

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
          <XAxis
            dataKey="label"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}건`}
          />
          <Bar
            dataKey="internCount"
            fill="hsl(var(--primary))"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyChartSkeleton() {
  return (
    <div className="w-full h-[300px] bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-muted-foreground text-sm">차트 로딩 중...</span>
    </div>
  );
}
