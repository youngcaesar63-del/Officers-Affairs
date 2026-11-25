
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, YAxis, XAxis, Cell, Tooltip, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { rankOrder } from '@/lib/constants';
import { getAllPersonnel } from '@/lib/data';
import { RanksChartClient } from './ranks-chart-client';


const rankColors: { [key: string]: string } = {
  'ملازم': 'hsl(var(--chart-1))',
  'ملازم أول': 'hsl(var(--chart-2))',
  'نقيب': 'hsl(var(--chart-3))',
  'رائد': 'hsl(var(--chart-4))',
  'مقدم': 'hsl(var(--chart-5))',
  'عقيد': '#F59E0B',
  'عميد': '#10B981',
  'لواء': '#3B82F6',
  'فريق': '#6366F1',
  'فريق أول': '#8B5CF6',
};

const chartConfig = {
  personnel: { label: 'ضباط' },
  'ملازم': { label: 'ملازم', color: 'hsl(var(--chart-1))' },
  'ملازم أول': { label: 'ملازم أول', color: 'hsl(var(--chart-2))' },
  'نقيب': { label: 'نقيب', color: 'hsl(var(--chart-3))' },
  'رائد': { label: 'رائد', color: 'hsl(var(--chart-4))' },
  'مقدم': { label: 'مقدم', color: 'hsl(var(--chart-5))' },
  'عقيد': { label: 'عقيد', color: '#F59E0B' },
  'عميد': { label: 'عميد', color: '#10B981' },
  'لواء': { label: 'لواء', color: '#3B82F6' },
  'فريق': { label: 'فريق', color: '#6366F1' },
  'فريق أول': { label: 'فريق أول', color: '#8B5CF6' },
};

export async function RanksChart() {
  const personnel = await getAllPersonnel();

  const rankCounts: { [key: string]: number } = {};
  personnel.forEach(p => {
      rankCounts[p.rank] = (rankCounts[p.rank] || 0) + 1;
  });

  let data = Object.entries(rankCounts).map(([rank, count]) => ({
      rank,
      personnel: count,
      fill: rankColors[rank] || '#ccc',
  }));
  
  data.sort((a,b) => (rankOrder[a.rank] || 99) - (rankOrder[b.rank] || 99));
   
  if (data.length === 0) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>توزيع الضباط حسب الرتب</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground">لا توجد بيانات لعرضها.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <RanksChartClient chartData={data} chartConfig={chartConfig} />
  );
}
