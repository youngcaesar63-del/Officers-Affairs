'use client';

import { useState } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, YAxis, XAxis, Cell, Tooltip, CartesianGrid } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type RanksChartClientProps = {
    chartData: any[];
    chartConfig: ChartConfig;
};

export function RanksChartClient({ chartData, chartConfig }: RanksChartClientProps) {
    const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

    return (
        <Card className="shadow-md flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>توزيع الضباط حسب الرتب</CardTitle>
                <div className="flex gap-2">
                    <Button
                        variant={chartType === 'pie' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setChartType('pie')}
                    >
                        <PieIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setChartType('bar')}
                    >
                        <BarChart2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 -mx-4">
                 <ChartContainer config={chartConfig} className="h-full w-full">
                    {chartType === 'pie' ? (
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="personnel" hideLabel />} />
                            <Pie data={chartData} dataKey="personnel" nameKey="rank" innerRadius={60} strokeWidth={5}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    ) : (
                       <BarChart data={chartData} layout="vertical" margin={{ right: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="rank"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                reversed={true}
                                width={80}
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                            <Bar dataKey="personnel" radius={5}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    )}
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
