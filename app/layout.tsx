import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ClientProviders } from '@/components/ClientProviders';

export const metadata: Metadata = {
  title: 'NursEd Admin | Page County Technical Center',
  description: 'Nursing Instructor Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f8f9fa] text-[#2d3436]">
        <ClientProviders>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8">
              {children}
            </main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
