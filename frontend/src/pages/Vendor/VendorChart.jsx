import React, { useState } from "react";
import { formatPrice } from "../../utils/price";

export default function VendorChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-500">
        No sales data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.Revenue || 0), 1000);
  const chartHeight = 165;
  const paddingBottom = 20;
  const paddingTop = 15;
  const paddingLeft = 35;
  const paddingRight = 10;
  
  // Y-axis tick values
  const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  return (
    <div className="relative w-full h-full flex flex-col justify-end select-none">
      {/* SVG Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[160px]">
        <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="1" />
              <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {ticks.map((tick, i) => {
            const ratio = tick / maxVal;
            const y = paddingTop + (1 - ratio) * (200 - paddingTop - paddingBottom);
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={500 - paddingRight} 
                  y2={y} 
                  stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="1" 
                  strokeDasharray="3 3"
                />
                {/* Y Axis Label */}
                <text 
                  x={paddingLeft - 8} 
                  y={y + 3} 
                  fill="rgba(255,255,255,0.4)" 
                  fontSize="8" 
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const numBars = data.length;
            const availableWidth = 500 - paddingLeft - paddingRight;
            const barSpacing = availableWidth / numBars;
            const barWidth = Math.max(barSpacing * 0.5, 14);
            const x = paddingLeft + idx * barSpacing + (barSpacing - barWidth) / 2;
            
            const revenue = item.Revenue || 0;
            const ratio = revenue / maxVal;
            const height = ratio * (200 - paddingTop - paddingBottom);
            const y = 200 - paddingBottom - height;

            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover trigger zone */}
                <rect
                  x={paddingLeft + idx * barSpacing}
                  y={paddingTop}
                  width={barSpacing}
                  height={200 - paddingTop - paddingBottom}
                  fill="transparent"
                  className="cursor-pointer"
                />
                {/* Colored Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(height, 2)}
                  rx="3"
                  ry="3"
                  fill="url(#barGrad)"
                  className="transition-all duration-300 hover:fill-[#f1c84b] cursor-pointer"
                />
                {/* Month Label */}
                <text
                  x={x + barWidth / 2}
                  y={200 - 4}
                  fill="rgba(255,255,255,0.4)"
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* State-based Responsive Tooltip overlay */}
        {hoveredIndex !== null && (
          <div 
            className="absolute z-50 bg-[#111111] border border-white/10 rounded-xl p-3 shadow-xl pointer-events-none transition-all duration-200"
            style={{
              left: `${((paddingLeft + hoveredIndex * ((500 - paddingLeft - paddingRight) / data.length) + ((500 - paddingLeft - paddingRight) / data.length) / 2) / 500) * 100}%`,
              bottom: "45px",
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-[10px] text-[#d4af37] font-bold uppercase tracking-wider">
              {data[hoveredIndex].month}
            </div>
            <div className="text-xs text-white font-semibold mt-1 whitespace-nowrap">
              Net Share: {formatPrice(data[hoveredIndex].Revenue)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
