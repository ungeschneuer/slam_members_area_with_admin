import React from 'react';

// Simplified SkeletonLoader - only keeping what's actually used
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero Section Skeleton */}
      <div className="bg-primary rounded-2xl p-8 text-white">
        <div className="skeleton h-12 w-1/2 mb-4 bg-white/20"></div>
        <div className="skeleton h-6 w-3/4 mb-6 bg-white/20"></div>
        <div className="skeleton h-4 w-2/3 bg-white/20"></div>
      </div>
      
      {/* Countdown Skeleton */}
      <div className="bg-red-500 rounded-2xl p-8 text-white">
        <div className="skeleton h-8 w-1/3 mx-auto mb-6 bg-white/20"></div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white/20 rounded-xl p-4">
              <div className="skeleton h-8 w-12 mx-auto mb-2 bg-white/30"></div>
              <div className="skeleton h-4 w-16 mx-auto bg-white/30"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* City Tips Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="skeleton-title w-1/2 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton-card"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
