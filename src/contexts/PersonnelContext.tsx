
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Personnel } from '@/lib/types';
import { getAllPersonnel as fetchAllPersonnel } from '@/lib/data';

interface PersonnelContextType {
  personnel: Personnel[];
  loading: boolean;
  refetch: () => void;
}

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

export function PersonnelProvider({ children }: { children: ReactNode }) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPersonnel();
      setPersonnel(data);
    } catch (error) {
      console.error("Failed to fetch personnel data for context:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PersonnelContext.Provider value={{ personnel, loading, refetch: fetchData }}>
      {children}
    </PersonnelContext.Provider>
  );
}

export function usePersonnel() {
  const context = useContext(PersonnelContext);
  if (context === undefined) {
    throw new Error('usePersonnel must be used within a PersonnelProvider');
  }
  return context;
}
