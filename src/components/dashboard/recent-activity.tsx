'use client';

import { UserPlus, Edit, FileText, Trash2, Award } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import type { Activity } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getActivityLog } from '@/lib/data';
import { Skeleton } from '../ui/skeleton';

const activityIcons: { [key: string]: { icon: React.ElementType, bg: string, color: string } } = {
  add_personnel: { icon: UserPlus, bg: 'bg-green-100 dark:bg-green-900', color: 'text-green-600 dark:text-green-300' },
  edit_personnel: { icon: Edit, bg: 'bg-blue-100 dark:bg-blue-900', color: 'text-blue-600 dark:text-blue-300' },
  delete_personnel: { icon: Trash2, bg: 'bg-red-100 dark:bg-red-900', color: 'text-red-600 dark:text-red-300' },
  create_report: { icon: FileText, bg: 'bg-amber-100 dark:bg-amber-900', color: 'text-amber-600 dark:text-amber-300' },
  promotion: { icon: Award, bg: 'bg-purple-100 dark:bg-purple-900', color: 'text-purple-600 dark:text-purple-300' },
  default: { icon: Award, bg: 'bg-gray-100 dark:bg-gray-900', color: 'text-gray-600 dark:text-gray-300' },
};

export function RecentActivity() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            setLoading(true);
            const data = await getActivityLog();
            setActivities(data.slice(0, 5));
            setLoading(false);
        };
        fetchActivities();
    }, []);

    const formatRelativeTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true, locale: arSA });
        } catch (error) {
            return 'منذ فترة';
        }
    };

    if (loading) {
        return (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>النشاط الأخير</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>النشاط الأخير</CardTitle>
                 {activities.length > 0 && 
                    <Button asChild variant="link" className="p-0 h-auto">
                        <Link href="#">عرض الكل</Link>
                    </Button>
                }
            </CardHeader>
            <CardContent>
                {activities.length > 0 ? (
                    <ul className="space-y-4">
                        {activities.map((activity) => {
                            const { icon: Icon, bg, color } = activityIcons[activity.type] || activityIcons.default;
                            return (
                                <li key={activity.id} className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full flex-shrink-0 ${bg}`}>
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{activity.title}</p>
                                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground/80 mt-1">{formatRelativeTime(activity.timestamp)}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground py-8">لا يوجد نشاط مسجل.</p>
                )}
            </CardContent>
        </Card>
    );
}
