
import React from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  thickness?: number;
}

export const ExpensePieChart: React.FC<PieChartProps> = ({ data, size = 360, thickness = 35 }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-400">
        <div className="w-32 h-32 rounded-full border-4 border-slate-100 dark:border-slate-800 mb-2 border-t-slate-200 dark:border-t-slate-700 flex items-center justify-center">
           <span className="text-xs font-medium">Sem dados</span>
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Chart Configuration
  // We use a larger internal coordinate system to allow space for labels outside the donut
  const internalSize = 400; 
  const center = internalSize / 2;
  const radius = 80; // Donut radius
  const labelRadius = radius + 30; // Where lines end
  
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock (-90 degrees)

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-md -my-4">
        <svg viewBox={`0 0 ${internalSize} ${internalSize}`} className="w-full h-auto font-sans">
          {sortedData.map((item, i) => {
            const percent = item.value / total;
            // Skip tiny slices to avoid clutter
            if (percent < 0.01) return null; 
            
            const sliceAngle = percent * 2 * Math.PI;
            const midAngle = currentAngle + sliceAngle / 2;
            
            // Calculate start angle in degrees for rotation
            const startAngleDeg = (currentAngle * 180) / Math.PI;
            
            // Dash Array for Circle Segment
            // Circumference = 2 * PI * radius
            // Dash = [ArcLength, RestOfCircumference]
            const circumference = 2 * Math.PI * radius;
            const dashArray = `${percent * circumference} ${circumference}`;
            
            // Coordinates for Callout Lines
            const x1 = center + radius * Math.cos(midAngle);
            const y1 = center + radius * Math.sin(midAngle);
            const x2 = center + labelRadius * Math.cos(midAngle);
            const y2 = center + labelRadius * Math.sin(midAngle);
            
            // Determine Text Anchor based on side (Left/Right)
            const isRight = Math.cos(midAngle) >= 0;
            const textAnchor = isRight ? 'start' : 'end';
            const textX = x2 + (isRight ? 10 : -10);
            
            // Advance angle for next slice
            currentAngle += sliceAngle;

            // Only show labels for slices > 3% to prevent overlap mess
            const showLabel = percent > 0.03;

            return (
              <g key={item.label}>
                {/* Donut Segment */}
                {/* Note: SVG Circle starts at 3 o'clock. We rotate it to align with our calculated angle */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={thickness}
                  strokeDasharray={dashArray}
                  strokeDashoffset={0}
                  transform={`rotate(${startAngleDeg} ${center} ${center})`}
                  className="transition-all duration-500"
                />
                
                {/* Callout Lines & Labels */}
                {showLabel && (
                  <g className="transition-opacity duration-500 animate-in fade-in">
                    {/* Line from slice to label */}
                    <polyline 
                      points={`${x1},${y1} ${x2},${y2} ${textX},${y2}`}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="1.5"
                      opacity="0.6"
                    />
                    {/* Label Text */}
                    <text
                      x={textX}
                      y={y2 - 4}
                      fill={item.color}
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor={textAnchor}
                      dominantBaseline="auto"
                    >
                      {Math.round(percent * 100)}%
                    </text>
                    <text
                      x={textX}
                      y={y2 + 12}
                      fill="currentColor"
                      fontSize="11"
                      fontWeight="500"
                      className="text-slate-500 dark:text-slate-400"
                      textAnchor={textAnchor}
                      dominantBaseline="auto"
                    >
                      {item.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detailed Legend with Values */}
      <div className="grid grid-cols-1 gap-y-3 w-full px-2 mt-4">
        {sortedData.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="font-bold text-slate-900 dark:text-slate-100">
                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
               </span>
               <span className="font-medium text-slate-400 w-8 text-right">
                 {Math.round((item.value / total) * 100)}%
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
