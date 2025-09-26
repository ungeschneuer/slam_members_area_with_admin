import React, { useState, useEffect } from 'react';
import sessionService from '../services/sessionService.js';

export default function SessionStatus() {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateSessionInfo = () => {
      const info = sessionService.getSessionInfo();
      setSessionInfo(info);
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  if (!sessionInfo || !sessionInfo.isActive) {
    return null;
  }

  const formatTimeRemaining = (milliseconds) => {
    if (milliseconds <= 0) return 'Expired';
    
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = (timeRemaining) => {
    if (timeRemaining < 5 * 60 * 1000) return 'text-red-500'; // Less than 5 minutes
    if (timeRemaining < 15 * 60 * 1000) return 'text-yellow-500'; // Less than 15 minutes
    return 'text-green-500';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Session Status"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor(sessionInfo.timeRemaining)}`}></div>
        <span className="text-gray-700 dark:text-gray-300">
          {formatTimeRemaining(sessionInfo.timeRemaining)}
        </span>
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 z-50">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Session Status</span>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(sessionInfo.timeRemaining)}`}></div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Time Remaining:</span>
                <span className="font-medium">{formatTimeRemaining(sessionInfo.timeRemaining)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Session Type:</span>
                <span className="font-medium">
                  {sessionInfo.isRememberMe ? 'Remember Me' : 'Standard'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Last Activity:</span>
                <span className="font-medium">
                  {new Date(sessionInfo.lastActivity).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  sessionService.extendSession();
                  setShowDetails(false);
                }}
                className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Extend Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
