import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { formatPeso } from "../../utils/orderUtils";
import Modal from "./Modal";

const SalesLineChart = ({ data, selectedMonth, selectedYear, size = 400 }) => {
  const [animatedData, setAnimatedData] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const animationDuration = 3000; // 3 seconds
  const containerRef = useRef(null);

  // Local tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipDetail, setTooltipDetail] = useState(null);

  // Color palette for different sales staff
  const colors = [
    "#007bff", // Blue
    "#28a745", // Green
    "#ffc107", // Yellow
    "#dc3545", // Red
    "#6f42c1", // Purple
    "#fd7e14", // Orange
    "#20c997", // Teal
    "#e83e8c", // Pink
    "#6c757d", // Gray
    "#17a2b8", // Cyan
  ];

  // Generate all days in the month
  const generateAllDays = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const allDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      // Use local date to avoid timezone issues
      const year = selectedYear;
      const month = selectedMonth - 1; // JavaScript months are 0-indexed
      const dateString = `${year}-${String(month + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      allDays.push(dateString);
    }

    return allDays;
  };

  // Fill missing days with previous cumulative value
  const fillMissingDays = (employeeData, allDays) => {
    const filledData = [];
    let lastCumulative = 0;

    allDays.forEach((day) => {
      // Convert backend date format (ISO) to match frontend format
      const existingDay = employeeData.find((d) => {
        const backendDate = new Date(d.date).toISOString().split("T")[0];
        return backendDate === day;
      });

      if (existingDay) {
        lastCumulative = parseFloat(existingDay.cumulativeSales) || 0;
        filledData.push({
          date: day,
          dailySales: parseFloat(existingDay.dailySales) || 0,
          cumulativeSales: lastCumulative,
        });
      } else {
        filledData.push({
          date: day,
          dailySales: 0,
          cumulativeSales: lastCumulative,
        });
      }
    });

    return filledData;
  };

  // Animation effect
  useEffect(() => {
    if (!data || data.length === 0) return;

    const allDays = generateAllDays();
    const processedData = data.map((employee) => ({
      ...employee,
      data: fillMissingDays(employee.data, allDays),
    }));

    // Set the final data immediately (no Y-axis animation)
    setAnimatedData(processedData);

    // Start dot animation
    setIsAnimating(true);
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animateChart);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, selectedMonth, selectedYear]);

  const animateChart = (timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);

    // Ease-out function for smoother animation
    const easeOutProgress = 1 - Math.pow(1 - progress, 3);

    // Update animation state for both line and dot visibility
    setAnimatedData((prevData) =>
      prevData.map((employee) => ({
        ...employee,
        data: employee.data.map((day, index) => ({
          ...day,
          // Animate both line and dot visibility based on progress
          showDot: index / (employee.data.length - 1) <= easeOutProgress,
          showLine: index / (employee.data.length - 1) <= easeOutProgress,
        })),
      }))
    );

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateChart);
    } else {
      setIsAnimating(false);
    }
  };

  // Calculate chart dimensions
  const margin = { top: 20, right: 80, bottom: 40, left: 60 };
  const chartWidth = size - margin.left - margin.right;
  const chartHeight = size * 0.6 - margin.top - margin.bottom;

  // Get max value for scaling
  const maxValue = Math.max(
    ...animatedData.flatMap((employee) =>
      employee.data.map((day) => parseFloat(day.cumulativeSales) || 0)
    ),
    0
  );

  // Scale functions
  const scaleX = (dayIndex) =>
    (dayIndex / (generateAllDays().length - 1)) * chartWidth;
  const scaleY = (value) => {
    const safeValue = parseFloat(value) || 0;
    const safeMaxValue = maxValue || 1;
    return chartHeight - (safeValue / safeMaxValue) * chartHeight;
  };

  // Format value for display
  const formatValue = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K";
    } else {
      return num.toString();
    }
  };

  // Generate path for line
  const generatePath = (employeeData) => {
    const allDays = generateAllDays();
    let path = "";
    let hasStarted = false;

    employeeData.forEach((day, index) => {
      const x = scaleX(index);
      const y = scaleY(parseFloat(day.cumulativeSales) || 0);

      if (day.showLine !== false) {
        if (!hasStarted) {
          path += `M ${x} ${y}`;
          hasStarted = true;
        } else {
          path += ` L ${x} ${y}`;
        }
      }
    });

    return path;
  };

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size * 0.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        <div className="text-muted">No sales data available</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size * 0.6 + 35, position: "relative" }}
    >
      <svg width={size} height={size * 0.6} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <g key={index}>
            <line
              x1={margin.left}
              y1={margin.top + ratio * chartHeight}
              x2={margin.left + chartWidth}
              y2={margin.top + ratio * chartHeight}
              stroke="#e9ecef"
              strokeWidth="1"
            />
            <text
              x={margin.left - 10}
              y={margin.top + ratio * chartHeight + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6c757d"
            >
              {formatValue(maxValue * (1 - ratio))}
            </text>
          </g>
        ))}

        {/* Day labels */}
        {generateAllDays().map((day, index) => {
          if (index % Math.ceil(generateAllDays().length / 8) === 0) {
            const dayNumber = new Date(day).getDate();
            return (
              <text
                key={day}
                x={margin.left + scaleX(index)}
                y={margin.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="10"
                fill="#6c757d"
              >
                {dayNumber}
              </text>
            );
          }
          return null;
        })}

        {/* Chart area */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Lines for each employee */}
          {animatedData.map((employee, employeeIndex) => (
            <g key={employee.employeeId}>
              <path
                d={generatePath(employee.data)}
                fill="none"
                stroke={colors[employeeIndex % colors.length]}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isAnimating ? 0.8 : 1}
              />

              {/* Data points */}
              {employee.data.map((day, dayIndex) => (
                <circle
                  key={`${employee.employeeId}-${dayIndex}`}
                  cx={scaleX(dayIndex)}
                  cy={scaleY(parseFloat(day.cumulativeSales) || 0)}
                  r="4"
                  fill={colors[employeeIndex % colors.length]}
                  opacity={day.showDot !== false ? 1 : 0}
                  onMouseEnter={(e) => {
                    const rect =
                      containerRef.current?.getBoundingClientRect?.();
                    const x = (e.clientX || 0) - (rect?.left || 0) + 10;
                    const y = (e.clientY || 0) - (rect?.top || 0) + 10;
                    setTooltipDetail({
                      total: parseFloat(day.cumulativeSales) || 0,
                      employeeName: employee.employeeName,
                      date: day.date,
                    });
                    setTooltipPosition({ x, y });
                    setShowTooltip(true);
                  }}
                  onMouseMove={(e) => {
                    const rect =
                      containerRef.current?.getBoundingClientRect?.();
                    const x = (e.clientX || 0) - (rect?.left || 0) + 10;
                    const y = (e.clientY || 0) - (rect?.top || 0) + 10;
                    setTooltipPosition({ x, y });
                  }}
                  onMouseLeave={() => {
                    setShowTooltip(false);
                  }}
                />
              ))}
            </g>
          ))}
        </g>

        {/* Legend */}
        <g
          transform={`translate(${margin.left + chartWidth + 10}, ${
            margin.top
          })`}
        >
          {animatedData.map((employee, index) => (
            <g
              key={employee.employeeId}
              transform={`translate(0, ${index * 20})`}
            >
              <circle
                cx="5"
                cy="5"
                r="5"
                fill={colors[index % colors.length]}
              />
              <text x="15" y="8" fontSize="11" fill="#495057">
                {employee.employeeName}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Tooltip for data points */}
      <Modal
        variant="tooltip"
        show={showTooltip && !!tooltipDetail}
        position={tooltipPosition}
      >
        <div className="text-center">
          {formatPeso(tooltipDetail?.total || 0)}
        </div>
      </Modal>

      {/* Month/Year display */}
      <div className="text-center mt-1">
        <small className="text-muted">
          {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
            "en-US",
            {
              month: "long",
              year: "numeric",
            }
          )}
        </small>
      </div>
    </div>
  );
};

SalesLineChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      employeeName: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(
        PropTypes.shape({
          date: PropTypes.string.isRequired,
          dailySales: PropTypes.number.isRequired,
          cumulativeSales: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  selectedMonth: PropTypes.number.isRequired,
  selectedYear: PropTypes.number.isRequired,
  size: PropTypes.number,
};

export default SalesLineChart;
