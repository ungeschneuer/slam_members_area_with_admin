import React from 'react';
import AdminNavigation from './navigation/AdminNavigation.jsx';

function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavigation />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

export { AdminLayout };
