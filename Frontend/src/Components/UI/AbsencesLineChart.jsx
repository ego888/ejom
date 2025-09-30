import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

const palette = [
  "#007bff",
  "#28a745",
  "#ffc107",
  "#dc3545",
  "#6f42c1",
  "#fd7e14",
  "#20c997",
  "#e83e8c",
  "#6c757d",
  "#17a2b8",
  "#343a40",
  "#6610f2",
];

const monthLabel = (month) => {
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return labels[month - 1] || month;
};

const buildSeriesPoints = (employees, months) => {
  return employees.map((employee, index) => {
    const color = palette[index % palette.length];
    let cumulative = 0;

    const points = months.map((month, monthIndex) => {
      cumulative += employee.monthlyAbsences[monthIndex] || 0;
      return {
        month,
        x: monthIndex,
        y: parseFloat(cumulative.toFixed(2)),
      };
    });

    return {
      empId: employee.empId,
      empName: employee.empName,
      color,
      points,
      total: parseFloat(cumulative.toFixed(2)),
    };
  });
};

const AbsencesLineChart = ({ employees, months }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;
      if (width) {
        setContainerWidth((prev) => (prev !== width ? width : prev));
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries?.[0];
      if (!entry) return;
      const width = entry.contentRect?.width || element.offsetWidth;
      if (width) {
        setContainerWidth((prev) => (prev !== width ? width : prev));
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const series = useMemo(
    () => buildSeriesPoints(employees, months),
    [employees, months]
  );

  if (!series.length || !months.length) {
    return (
      <div className="alert alert-info mb-0" role="alert">
        No chart data available.
      </div>
    );
  }

  const maxValue = Math.max(
    ...series.flatMap((employee) => employee.points.map((point) => point.y)),
    0
  );
  const effectiveWidth = Math.max(containerWidth || 720, 320);
  const baseHeight = Math.max(Math.round(effectiveWidth * 0.45), 300);

  const paddingLeft = 72;
  const paddingRight = 180;
  const paddingTop = 32;
  const paddingBottom = 48;

  const innerWidth = Math.max(effectiveWidth - paddingLeft - paddingRight, 240);
  const innerHeight = Math.max(baseHeight - paddingTop - paddingBottom, 220);

  const chartWidth = paddingLeft + innerWidth + paddingRight;
  const chartHeight = paddingTop + innerHeight + paddingBottom;

  const scaleX = (index) =>
    paddingLeft + (months.length > 1 ? (index / (months.length - 1)) * innerWidth : innerWidth / 2);

  const safeMaxValue = maxValue > 0 ? maxValue : 1;
  const scaleY = (value) =>
    paddingTop + innerHeight - Math.min(value / safeMaxValue, 1) * innerHeight;

  const yTickStep = safeMaxValue > 5 ? Math.ceil(safeMaxValue / 5) : 1;
  const ticks = [];
  for (let tick = 0; tick <= safeMaxValue; tick += yTickStep) {
    ticks.push(parseFloat(tick.toFixed(2)));
  }
  if (ticks[ticks.length - 1] < safeMaxValue) {
    ticks.push(parseFloat(safeMaxValue.toFixed(2)));
  }

  return (
    <div
      ref={containerRef}
      className="absences-chart position-relative"
      style={{ width: "100%" }}
    >
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {series.map((employee) => (
            <marker
              key={`dot-${employee.empId}`}
              id={`dot-${employee.empId}`}
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
            >
              <circle cx="3" cy="3" r="3" fill={employee.color} />
            </marker>
          ))}
        </defs>

        <line
          x1={paddingLeft}
          y1={paddingTop + innerHeight}
          x2={paddingLeft + innerWidth}
          y2={paddingTop + innerHeight}
          stroke="#ced4da"
          strokeWidth="1"
        />
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + innerHeight}
          stroke="#ced4da"
          strokeWidth="1"
        />

        {months.map((month, index) => (
          <g key={`x-grid-${month}`}>
            <line
              x1={scaleX(index)}
              y1={paddingTop + innerHeight}
              x2={scaleX(index)}
              y2={paddingTop}
              stroke="#f1f3f5"
              strokeWidth="1"
            />
            <text
              x={scaleX(index)}
              y={paddingTop + innerHeight + 28}
              textAnchor="middle"
              fontSize="12"
              fill="#495057"
            >
              {monthLabel(month)}
            </text>
          </g>
        ))}

        {ticks.map((tickValue) => (
          <g key={`y-grid-${tickValue}`}>
            <line
              x1={paddingLeft}
              y1={scaleY(tickValue)}
              x2={paddingLeft + innerWidth}
              y2={scaleY(tickValue)}
              stroke="#f1f3f5"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 10}
              y={scaleY(tickValue) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#495057"
            >
              {tickValue.toFixed(2)}
            </text>
          </g>
        ))}

        {series.map((employee) => {
          const pathData = employee.points
            .map((point, pointIndex) => {
              const prefix = pointIndex === 0 ? "M" : "L";
              return `${prefix}${scaleX(point.x)} ${scaleY(point.y)}`;
            })
            .join(" ");

          return (
            <path
              key={`line-${employee.empId}`}
              d={pathData}
              fill="none"
              stroke={employee.color}
              strokeWidth="2"
            />
          );
        })}

        {series.map((employee) =>
          employee.points.map((point) => (
            <circle
              key={`dot-${employee.empId}-${point.x}`}
              cx={scaleX(point.x)}
              cy={scaleY(point.y)}
              r={4}
              fill="#fff"
              stroke={employee.color}
              strokeWidth="2"
            >
              <title>
                {employee.empName}: {point.y.toFixed(2)} days
              </title>
            </circle>
          ))
        )}

        {series.map((employee) => {
          const lastPoint = employee.points[employee.points.length - 1];
          return (
            <text
              key={`label-${employee.empId}`}
              x={scaleX(lastPoint.x) + 10}
              y={scaleY(lastPoint.y) + 4}
              fontSize="12"
              fill={employee.color}
            >
              {employee.empName}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

AbsencesLineChart.propTypes = {
  employees: PropTypes.arrayOf(
    PropTypes.shape({
      empId: PropTypes.string.isRequired,
      empName: PropTypes.string.isRequired,
      monthlyAbsences: PropTypes.arrayOf(PropTypes.number).isRequired,
      totalAbsence: PropTypes.number.isRequired,
    })
  ).isRequired,
  months: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default AbsencesLineChart;
