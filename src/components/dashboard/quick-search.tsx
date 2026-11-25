
'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { getAllPersonnel } from '@/lib/data';
import type { Personnel } from '@/lib/types';


type PersonnelSummary = {
  id: number;
  name: string;
  cardId: string;
  rank: string;
};

export function QuickSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
      const fetchData = async () => {
          setLoading(true);
          const data = await getAllPersonnel();
          setAllPersonnel(data);
          setLoading(false);
      }
      fetchData();
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery) {
      return [];
    }
    return allPersonnel.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.cardId.includes(searchQuery)
    ).slice(0, 7);
  }, [searchQuery, allPersonnel]);

  const handleSelectPersonnel = (person: PersonnelSummary) => {
    startTransition(() => {
        router.push(`/dashboard/personnel-list/${person.id}`);
        setSearchQuery('');
    });
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>بحث سريع</CardTitle>
        <CardDescription>ابحث عن ضابط بالاسم أو رقم البطاقة للوصول السريع لملفه.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث..." 
            className="pr-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isPending || loading}
          />
          {searchResults.length > 0 && (
            <div className="absolute z-20 w-full bg-card border rounded-md shadow-lg mt-1 max-h-72 overflow-y-auto">
              {searchResults.map(p => (
                <div 
                  key={p.id}
                  className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                  onClick={() => handleSelectPersonnel(p)}
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.rank} - {p.cardId}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
