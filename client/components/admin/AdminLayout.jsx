import React from 'react';
import AdminNavigation from './AdminNavigation.jsx';

function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavigation />
      
      {/* Main content with responsive margins */}
      <div className="pb-20 md:pb-0 md:ml-64">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export { AdminLayout };
