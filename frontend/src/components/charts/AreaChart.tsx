import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '../../utils/classNames';

interface AreaChartProps {
  data: Array<Record<string, string | number>>;
  areas: Array<{
    dataKey: string;
    color: string;
    name?: string;
    fillOpacity?: number;
  }>;
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  stacked?: boolean;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  areas,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className,
  yAxisFormatter,
  xAxisFormatter,
  stacked = false,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name || area.dataKey}
              stroke={area.color}
              fill={area.color}
              fillOpacity={area.fillOpacity || 0.1}
              strokeWidth={2}
              stackId={stacked ? 'stack' : undefined}
              animationDuration={1000 + index * 200}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};