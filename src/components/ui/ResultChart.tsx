'use client';

import React, { useState, useEffect } from 'react';

interface ResultChartProps {
  percentage: number;
  category: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  userName?: string;
  className?: string;
  title?: string;
  showGradientBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  translations?: {
    biasRange?: string;
    veryLow?: string;
    low?: string;
    moderate?: string;
    high?: string;
    veryHigh?: string;
    biasLabel?: string;
    objectivityLabel?: string;
    yourScore?: string;
    yourScoreWithName?: string;
  };
}

export function ResultChart({ 
  percentage, 
  category, 
  userName, 
  className = '', 
  title,
  showGradientBar = true,
  size = 'md',
  translations = {}
}: ResultChartProps) {
  const chartSize = {
    sm: { width: 200, height: 200, innerRadius: 60, strokeWidth: 20, fontSize: 'text-3xl' },
    md: { width: 256, height: 256, innerRadius: 80, strokeWidth: 24, fontSize: 'text-4xl' },
    lg: { width: 280, height: 280, innerRadius: 90, strokeWidth: 28, fontSize: 'text-4xl' }
  }[size];

  // 번역된 제목 사용, 사용자 이름이 있으면 포함
  let defaultTitle;
  if (userName && translations.yourScoreWithName) {
    // {name} 플레이스홀더를 실제 이름으로 치환
    defaultTitle = translations.yourScoreWithName.replace('{name}', userName);
  } else if (userName) {
    // yourScoreWithName이 없으면 fallback 사용
    const translatedTitle = translations.yourScore || 'Bias Index';
    defaultTitle = `${userName}님의 ${translatedTitle}`;
  } else {
    // 사용자 이름이 없으면 기본 제목만 사용
    defaultTitle = translations.yourScore || 'Bias Index';
  }
  const displayTitle = title || defaultTitle;
  
  const circumference = 2 * Math.PI * chartSize.innerRadius;
  const strokeDasharray = circumference;
  const targetStrokeDashoffset = circumference * (1 - percentage / 100);
  const color = getColorForPercentage(percentage);

  // 애니메이션을 위한 고유 ID 생성
  const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`text-center ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes drawChart-${chartId} {
            from {
              stroke-dashoffset: ${circumference};
            }
            to {
              stroke-dashoffset: ${targetStrokeDashoffset};
            }
          }
          
          .chart-${chartId} {
            stroke-dashoffset: ${targetStrokeDashoffset}; /* 최종 상태를 기본값으로 */
            animation: drawChart-${chartId} 2s ease-out 0.5s forwards !important;
          }
          
          /* 이미지 캡처 시 애니메이션 비활성화 */
          @media print, (max-resolution: 1dppx) {
            .chart-${chartId} {
              animation: none !important;
              stroke-dashoffset: ${targetStrokeDashoffset} !important;
            }
          }
          
          .chart-text-${chartId} {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999 !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            pointer-events: none !important;
          }
        `
      }} />
      
      {/* 제목 */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {displayTitle}
      </h2>
      
      {/* 도넛 차트 */}
      <div className="flex justify-center mb-6">
        <div 
          className="relative flex items-center justify-center" 
          style={{ 
            width: chartSize.width, 
            height: chartSize.height
          }}
        >
          <svg 
            className="transform -rotate-90 w-full h-full" 
            width={chartSize.width} 
            height={chartSize.height}
            viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-labelledby="chart-title"
            aria-describedby="chart-desc"
          >
            <title id="chart-title">편향성 지수 차트</title>
            <desc id="chart-desc">{`편향성 지수: ${percentage}%, 카테고리: ${category}`}</desc>
            
            {/* 배경 원 */}
            <circle
              cx={chartSize.width / 2}
              cy={chartSize.height / 2}
              r={chartSize.innerRadius}
              stroke="#e5e7eb"
              strokeWidth={chartSize.strokeWidth}
              fill="transparent"
              className="opacity-30"
            />
            
            {/* 진행률 원 - 애니메이션 포함 */}
            <circle
              cx={chartSize.width / 2}
              cy={chartSize.height / 2}
              r={chartSize.innerRadius}
              stroke={color}
              strokeWidth={chartSize.strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className={`chart-${chartId}`}
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
              }}
            />
          </svg>
          
          {/* 중앙 텍스트 - %만 표시 */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none chart-text-${chartId}`}>
            <div className="text-center flex items-center justify-center h-full w-full">
              <div 
                className={`${chartSize.fontSize} font-black leading-none`}
                style={{ 
                  color,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1,
                  zIndex: 999,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {percentage}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGradientBar && (
        <>
          {/* 편향성 범위 바 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {translations.biasRange || '편향성 범위'}
            </h3>
            
            {/* 범위 표시 라벨 */}
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>{translations.veryLow || '매우 낮음'}</span>
              <span>{translations.low || '낮음'}</span>
              <span>{translations.moderate || '보통'}</span>
              <span>{translations.high || '높음'}</span>
              <span>{translations.veryHigh || '매우 높음'}</span>
            </div>
            
            {/* 그라데이션 바 */}
            <div 
              className="relative h-6 rounded-full overflow-hidden border border-gray-200"
              style={{
                background: 'linear-gradient(to right, #10b981 0%, #22c55e 20%, #f59e0b 40%, #f97316 60%, #ef4444 80%, #dc2626 100%)',
                width: '100%',
                display: 'block'
              }}
            >
              {/* 현재 위치 표시 */}
              <div
                className="absolute top-0 h-full w-1 bg-gray-900 shadow-lg transition-all duration-1000 ease-out z-10"
                style={{ 
                  left: `${percentage}%`, 
                  transform: 'translateX(-50%)',
                  backgroundColor: '#1f2937'
                }}
              />
            </div>
          </div>

        </>
      )}

    </div>
  );
}

export function getColorForCategory(category: string): string {
  switch (category) {
    case 'very_low':
    case 'extremely_low':
      return '#10b981'; // green-500
    case 'low':
    case 'somewhat_low':
      return '#22c55e'; // green-400
    case 'moderate':
    case 'average':
    case 'below_average':
    case 'above_average':
      return '#f59e0b'; // amber-500
    case 'high':
    case 'somewhat_high':
    case 'above_moderate':
    case 'moderately_high':
    case 'considerably_high':
      return '#f97316'; // orange-500
    case 'very_high':
    case 'quite_high':
    case 'serious':
    case 'very_serious':
    case 'extremely_serious':
    case 'dangerous':
    case 'extreme':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

// 백분율에 따른 동적 색상 계산 함수
export function getColorForPercentage(percentage: number): string {
  if (percentage <= 15) {
    return '#10b981'; // 매우 낮음 - 초록색
  } else if (percentage <= 30) {
    return '#22c55e'; // 낮음 - 연한 초록색  
  } else if (percentage <= 50) {
    return '#f59e0b'; // 보통 - 노란색
  } else if (percentage <= 70) {
    return '#f97316'; // 높음 - 주황색
  } else {
    return '#ef4444'; // 매우 높음 - 빨간색
  }
}