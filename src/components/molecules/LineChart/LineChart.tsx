import type React from "react";
import styles from "./LineChart.module.scss";

interface ChartData {
  month: string;
  value: number;
}

interface LineChartProps {
  data: ChartData[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const width = 800;
  const height = 300;
  const padding = 40;

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const valueRange = maxValue - minValue;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((item, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index;
    const y =
      padding +
      chartHeight -
      ((item.value - minValue) / valueRange) * chartHeight;
    return { x, y, ...item };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const yAxisSteps = 5;
  const gridLines = Array.from({ length: yAxisSteps }, (_, i) => {
    const value = minValue + (valueRange / (yAxisSteps - 1)) * i;
    const y =
      padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    return { y, value: Math.round(value) };
  });

  return (
    <div className={styles.chartContainer}>
      <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {gridLines.map((line, index) => (
          <g key={index}>
            <line
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              className={styles.gridLine}
            />
            <text
              x={padding - 10}
              y={line.y + 4}
              textAnchor="end"
              className={styles.axisText}
            >
              {line.value}
            </text>
          </g>
        ))}

        {/* X axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className={styles.axisLine}
        />

        {/* Y axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className={styles.axisLine}
        />

        {/* Line path */}
        <path d={pathData} className={styles.line} />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            className={styles.dot}
          >
            <title>
              {point.month}: {point.value}
            </title>
          </circle>
        ))}

        {/* X axis labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - padding + 20}
            textAnchor="middle"
            className={styles.axisText}
          >
            {point.month}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default LineChart;
