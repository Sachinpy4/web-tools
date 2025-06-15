import React from 'react'

interface ProgressCircleProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  showValue?: boolean
}

export function ProgressCircle({
  value,
  size = 'medium',
  showValue = false
}: ProgressCircleProps) {
  // Normalize value to be between 0 and 100
  const normalizedValue = Math.max(0, Math.min(100, value))
  
  // Calculate radius and stroke width based on size
  const dimensions = {
    small: { size: 20, strokeWidth: 2.5, fontSize: 8 },
    medium: { size: 40, strokeWidth: 4, fontSize: 12 },
    large: { size: 60, strokeWidth: 5, fontSize: 16 }
  }
  
  const { size: circleSize, strokeWidth, fontSize } = dimensions[size]
  const radius = (circleSize - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (normalizedValue / 100) * circumference
  
  // Determine color based on value
  let color
  if (normalizedValue >= 80) {
    color = 'rgb(34, 197, 94)' // green-500
  } else if (normalizedValue >= 50) {
    color = 'rgb(245, 158, 11)' // amber-500
  } else {
    color = 'rgb(239, 68, 68)' // red-500
  }
  
  return (
    <div className="inline-flex items-center justify-center">
      <svg 
        width={circleSize} 
        height={circleSize} 
        viewBox={`0 0 ${circleSize} ${circleSize}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className="text-muted stroke-current"
        />
        
        {/* Progress circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      </svg>
      
      {showValue && (
        <span 
          className="absolute" 
          style={{ 
            fontSize: `${fontSize}px`,
            color
          }}
        >
          {Math.round(normalizedValue)}
        </span>
      )}
    </div>
  )
} 