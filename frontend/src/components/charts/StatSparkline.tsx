import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '../../utils/classNames';

interface StatSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number | string;
  className?: string;
  showArea?: boolean;
}

export const StatSparkline: React.FC<StatSparklineProps> = ({
  data,
  color = '#7A1C2C',
  height = 50,
  width = '100%',
  className,
  showArea = true,
}) => {
  const chartData = data.map((value, index) => ({ value, index }));
  
  // Calculate min/max for better scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return (
    <div className={cn('w-full', className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          {showArea && (
            <defs>
              <linearGradient id={`sparklineGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          {showArea && (
            <Line
              type="monotone"
              dataKey="value"
              stroke="transparent"
              fill={`url(#sparklineGradient-${color.replace('#', '')})`}
              dot={false}
              strokeWidth={0}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};