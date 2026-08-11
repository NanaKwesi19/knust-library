import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from 'recharts';
import { cn } from '../../utils/classNames';

interface LineChartProps {
  data: Array<Record<string, string | number>>;
  lines: Array<{
    dataKey: string;
    color: string;
    name?: string;
    strokeWidth?: number;
    area?: boolean;
    areaColor?: string;
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

export const LineChart: React.FC<LineChartProps> = ({
  data,
  lines,
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
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          {lines.map((line, index) => (
            <React.Fragment key={line.dataKey}>
              {line.area && (
                <Area
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke="transparent"
                  fill={line.areaColor || `${line.color}20`}
                  animationDuration={1000 + index * 200}
                />
              )}
              <Line
                type="monotone"
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: line.color, stroke: 'white', strokeWidth: 2 }}
                animationDuration={1000 + index * 200}
              />
            </React.Fragment>
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};