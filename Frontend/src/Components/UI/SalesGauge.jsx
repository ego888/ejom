import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { formatPeso } from "../../utils/orderUtils";
const SalesGauge = ({
  value,
  maxValue,
  targetValue,
  title,
  size = 200,
  segments = 8,
}) => {
  // Add animation state
  const [animatedValue, setAnimatedValue] = useState(1); // Start from almost zero
  const [isAnimating, setIsAnimating] = useState(false);
  const requestRef = useRef(null);
  const startTimeRef = useRef(null);
  const animationDuration = 4000; // Animation duration in ms
  const prevValueRef = useRef(value);

  // Reset animation when value changes
  useEffect(() => {
    // Only start animation if the value has changed or component just mounted
    if (value !== prevValueRef.current) {
      // Cancel any existing animation
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      // Reset to starting position
      setAnimatedValue(1);
      setIsAnimating(true);

      // Start new animation with slight delay
      const timer = setTimeout(() => {
        startTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animateNeedle);
      }, 400);

      // Update previous value
      prevValueRef.current = value;

      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(requestRef.current);
      };
    }
  }, [value]); // Depend on value to retrigger animation when it changes

  // Animation function
  const animateNeedle = (timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);

    // Ease-out function for smoother finish
    const easeOutProgress = 1 - Math.pow(1 - progress, 3);

    // Calculate intermediate value
    const newValue = 1 + (value - 1) * easeOutProgress;
    setAnimatedValue(newValue);

    if (progress < 1) {
      requestRef.current = requestAnimationFrame(animateNeedle);
    } else {
      setIsAnimating(false);
    }
  };

  // Calculate the percentage and angle for the needle
  const safeValue = isNaN(animatedValue) ? 0 : animatedValue;
  const safeMaxValue = isNaN(maxValue) || maxValue <= 0 ? 1 : maxValue;
  const percentage = Math.min(
    Math.max((safeValue / safeMaxValue) * 100, 0),
    100
  );
  const angle = percentage * 1.8 - 90; // Convert percentage to angle (-90 to 90 degrees)

  // Size calculations - adjust positioning to move gauge up
  const radius = (size * 0.8) / 2;
  const centerX = size / 2 - 6;
  const centerY = size * 0.65 - 100; // Reduced from 0.8 to move up
  const textCenterX = centerX;
  const textCenterY = centerY - 40;
  const strokeWidth = size * 0.08;
  const fontSize = size / 14;
  const labelFontSize = size / 16;
  const valueFontSize = size / 10;

  // Format value to show K or M
  const formatValueWithUnit = (num) => {
    // Handle NaN, null, undefined, or invalid numbers
    if (isNaN(num) || num === null || num === undefined) {
      return "0";
    }

    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K";
    } else {
      return num.toString();
    }
  };

  // Create tick marks and labels
  const ticks = [];
  const tickLabels = [];
  const segmentStep = maxValue / segments;

  for (let i = 0; i <= segments; i++) {
    const segmentValue = i * segmentStep;
    const segmentPercentage = (segmentValue / maxValue) * 100;
    const segmentAngle = segmentPercentage * 1.8 - 90;
    const segmentRadian = (segmentAngle * Math.PI - 283) / 180;

    const stroke = strokeWidth / 2;
    // Calculate position for tick marks
    const tickStart = {
      x: centerX + (radius - stroke) * Math.cos(segmentRadian),
      y: centerY + (radius - stroke) * Math.sin(segmentRadian),
    };

    const tickEnd = {
      x: centerX + (radius - stroke * 2) * Math.cos(segmentRadian),
      y: centerY + (radius - stroke * 2) * Math.sin(segmentRadian),
    };

    ticks.push(
      <line
        key={`tick-${i}`}
        x1={tickStart.x}
        y1={tickStart.y}
        x2={tickEnd.x}
        y2={tickEnd.y}
        stroke="#333"
        strokeWidth={size / 150}
      />
    );

    // Calculate position for labels
    const labelPosition = {
      x: centerX + (radius - strokeWidth * 1.5) * Math.cos(segmentRadian),
      y: centerY + (radius - strokeWidth * 1.5) * Math.sin(segmentRadian),
    };

    tickLabels.push(
      <text
        key={`label-${i}`}
        x={labelPosition.x}
        y={labelPosition.y}
        fill="#333"
        fontSize="8px"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {formatValueWithUnit(segmentValue)}
      </text>
    );
  }

  // Create the colored arc segments
  const createArcPath = (startAngle, endAngle) => {
    const start = {
      x: centerX + radius * Math.cos((startAngle * Math.PI) / 180),
      y: centerY + radius * Math.sin((startAngle * Math.PI) / 180),
    };

    const end = {
      x: centerX + radius * Math.cos((endAngle * Math.PI) / 180),
      y: centerY + radius * Math.sin((endAngle * Math.PI) / 180),
    };

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Define color segments (green, yellow, red)
  const colorSegments = [
    { color: "#cc3000", start: -180, end: -150 }, // Red (0-33%)
    { color: "#FF5722", start: -150, end: -120 }, // Amber (33-50%)
    { color: "#FFC107", start: -120, end: -90 }, // Yellow (50-67%)
    { color: "#FFEB3B", start: -90, end: -60 }, // Amber (67-83%)
    { color: "#CDDC39", start: -60, end: -30 }, // Yellow-Green (33-50%)
    { color: "#4CAF50", start: -30, end: 0 }, // Green (0-33%)
  ];

  const arcs = colorSegments.map((segment, index) => (
    <path
      key={`arc-${index}`}
      d={createArcPath(segment.start, segment.end)}
      stroke={segment.color}
      strokeWidth={strokeWidth}
      fill="none"
    />
  ));

  // Calculate needle points
  const needleRadian = (angle * Math.PI - 283) / 180;
  const needleLength = radius - strokeWidth * 2;
  const needleWidth = size / 25;

  const needleTip = {
    x: centerX + needleLength * Math.cos(needleRadian),
    y: centerY + needleLength * Math.sin(needleRadian),
  };

  const needleBase1 = {
    x: centerX + (needleWidth / 2) * Math.cos(needleRadian + Math.PI / 2),
    y: centerY + (needleWidth / 2) * Math.sin(needleRadian + Math.PI / 2),
  };

  const needleBase2 = {
    x: centerX + (needleWidth / 2) * Math.cos(needleRadian - Math.PI / 2),
    y: centerY + (needleWidth / 2) * Math.sin(needleRadian - Math.PI / 2),
  };

  // Format the displayed value with ₱ symbol and K/M suffix
  const formattedValue = formatPeso(value);

  // Calculate percentage for display
  const safeValueForPercentage = isNaN(value) ? 0 : value;
  const safeMaxValueForPercentage =
    isNaN(maxValue) || maxValue <= 0 ? 1 : maxValue;
  const percentageText = `${Math.round(
    (safeValueForPercentage / safeMaxValueForPercentage) * 100
  )}% of target`;

  return (
    <div
      className="gauge-container"
      style={{
        width: size * 2, // Increased to make room for text on the right
        height: size * 0.75, // Reduced from 0.7 to prevent overflow
        margin: "0 auto",
        position: "relative",
      }}
    >
      <svg
        width={size * 2.4}
        height={size * 2.1}
        viewBox={`0 0 ${size * 1.6} ${size}`}
      >
        {/* Background */}
        <path
          d={createArcPath(-180, 0)}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Colored segments */}
        {arcs}

        {/* Tick marks and labels */}
        {ticks}
        {tickLabels}

        {/* Needle */}
        <path
          d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
          fill="#666"
        />

        {/* Needle center */}
        <circle cx={centerX} cy={centerY} r={size / 53} fill="#666" />

        {/* Current value - moved to right side */}
        <text
          x={textCenterX + radius + 20}
          y={textCenterY - 10}
          fontSize="18px"
          fontWeight="bold"
          textAnchor="start"
        >
          {formattedValue}
        </text>

        {/* Title - moved to right side */}
        <text
          x={textCenterX + radius + 20}
          y={textCenterY + 10}
          fontSize="12px"
          textAnchor="start"
        >
          {title}
        </text>

        {/* Percentage - added below title */}
        <text
          x={textCenterX + radius + 20}
          y={textCenterY + 27}
          fontSize="10px"
          textAnchor="start"
          fill="#666"
        >
          {percentageText}
        </text>
      </svg>
    </div>
  );
};

SalesGauge.propTypes = {
  value: PropTypes.number.isRequired,
  maxValue: PropTypes.number.isRequired,
  targetValue: PropTypes.number,
  title: PropTypes.string,
  size: PropTypes.number,
  segments: PropTypes.number,
};

export default SalesGauge;
