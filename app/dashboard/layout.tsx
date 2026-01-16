import React from 'react';
import Sidebar from '@/components/layout/Sidebar'; // <--- Import the new Sidebar

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-black">
      
      {/* 1. The Fixed Sidebar */}
      <Sidebar />

      {/* 2. The Main Content Area */}
      {/* ml-64 pushes content right to make room for the 16rem (64) sidebar */}
      <main className="flex-1 ml-64 min-w-0">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
    </div>
  );
}