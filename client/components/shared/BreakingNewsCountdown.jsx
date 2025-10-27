import React, { useState, useEffect } from 'react';
import { createTimezoneAwareCountdown } from '../../services/timezoneService.js';

/**
 * Shared BreakingNewsCountdown component with variant support
 * @param {Object} props
 * @param {string} props.breaking_news_until - ISO date string for countdown end
 * @param {string} props.variant - 'default' | 'admin' | 'compact' - determines styling and update frequency
 * @param {string} props.className - Additional CSS classes
 */
const BreakingNewsCountdown = ({ 
  breakingNewsUntil, 
  variant = 'default',
  className = '' 
}) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!breakingNewsUntil) return;

    // Use timezone-aware countdown service
    const cleanup = createTimezoneAwareCountdown(
      breakingNewsUntil,
      (countdownData) => {
        if (!countdownData.expired) {
          let timeString = '';
          if (countdownData.days > 0) timeString += `${countdownData.days}d `;
          if (countdownData.hours > 0) timeString += `${countdownData.hours}h `;
          if (countdownData.minutes > 0) timeString += `${countdownData.minutes}m `;
          
          // Include seconds for admin variant (real-time updates)
          if (variant === 'admin') {
            timeString += `${countdownData.seconds}s`;
          } else {
            // Remove trailing space if no seconds
            timeString = timeString.trim();
          }

          setTimeLeft(timeString.trim());
        } else {
          setTimeLeft(variant === 'admin' ? 'Abgelaufen' : '');
        }
      },
      variant === 'admin' ? 1000 : 60000
    );

    return cleanup;
  }, [breakingNewsUntil, variant]);

  if (!timeLeft) return null;

  // Different styling based on variant
  const isExpired = timeLeft === 'Abgelaufen';
  const isNearExpiry = timeLeft.includes('h') && parseInt(timeLeft.split('h')[0]) < 2;

  if (variant === 'admin') {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isExpired 
          ? 'bg-red-100 text-red-800' 
          : isNearExpiry 
            ? 'bg-yellow-100 text-yellow-800' 
            : 'bg-[#A2D2B9]/20 text-[#185757]'
      } ${className}`}>
        {timeLeft}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span className={`text-xs text-white/70 ${className}`}>
        (noch {timeLeft})
      </span>
    );
  }

  // Default variant (public-facing)
  return (
    <span className={`text-xs opacity-75 ml-2 ${className}`}>
      (noch {timeLeft})
    </span>
  );
};

export default BreakingNewsCountdown;
