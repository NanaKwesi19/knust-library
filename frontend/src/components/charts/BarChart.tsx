import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '../../utils/classNames';

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  bars: Array<{
    dataKey: string;
    color: string;
    name?: string;
    radius?: [number, number, number, number];
  }>;
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  bars,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className,
  yAxisFormatter,
  xAxisFormatter,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={yAxisFormatter}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
              cursor={{ fill: '#f1f5f9', radius: 4 }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color}
              radius={bar.radius || [4, 4, 0, 0]}
              animationDuration={1000 + index * 200}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};