
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import type { User } from '@/lib/types';
import { PersonnelProvider } from '@/contexts/PersonnelContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userString = sessionStorage.getItem('user');
      if (userString) {
        setUser(JSON.parse(userString));
      } else {
        router.replace('/login');
      }
    } catch (error) {
        console.error("Failed to parse user from sessionStorage", error);
        router.replace('/login');
    } finally {
        setLoading(false);
    }
  }, [router]);

  if (loading || !user) {
    return (
        <div className="min-h-screen w-full bg-muted/40 p-6">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="flex gap-6">
                <Skeleton className="h-[calc(100vh-100px)] w-64 rounded-lg hidden lg:block" />
                <div className="flex-1 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <PersonnelProvider>
        <div className="min-h-screen w-full bg-muted/40">
          <DashboardHeader user={user} />
          <div className="flex">
            <DashboardSidebar />
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
    </PersonnelProvider>
  );
}
