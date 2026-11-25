
'use client';

import { useState, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, Moon, Settings, Sun, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { usePersonnel } from '@/contexts/PersonnelContext';
import type { User, Activity as Notification } from '@/lib/types';

const formatArabicNumber = (num: number) => {
    return new Intl.NumberFormat('ar-EG').format(num);
}

const generateNotifications = (personnelData: any[]): Notification[] => {
    let notifications: Notification[] = [];
    try {
        const incompletePersonnel = personnelData.filter((p: any) => !p.cardId || !p.rank || !p.administration);
        if (incompletePersonnel.length > 0) {
            notifications.push({
                id: 'incomplete-data',
                title: 'بيانات غير مكتملة',
                description: `هناك ${formatArabicNumber(incompletePersonnel.length)} ضباط ببيانات غير مكتملة تحتاج إلى مراجعة.`,
                type: 'edit_personnel',
                timestamp: new Date().toISOString(),
            });
        }
    } catch(e) {
        console.error("Failed to generate notifications", e);
    }
    return notifications;
};


export function DashboardHeader({ user }: { user: User }) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const { personnel, loading } = usePersonnel();
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<Notification[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  
  useEffect(() => {
    if (!loading && personnel.length > 0) {
      const allNotifications = generateNotifications(personnel);
      setActiveNotifications(allNotifications.filter(n => !readNotifications.includes(n.id)));
    }
  }, [personnel, loading, readNotifications]);


  const handleLogout = async () => {
    sessionStorage.removeItem('user');
    toast({ title: 'تم تسجيل الخروج بنجاح' });
    setLogoutModalOpen(false);
    router.push('/login');
  };

  const clearNotifications = () => {
    const allNotifications = generateNotifications(personnel);
    const allNotificationIds = allNotifications.map(n => n.id);
    setReadNotifications(allNotificationIds);
    toast({
        title: 'تم مسح الإشعارات',
    });
  }

  return (
    <header className="bg-card border-b py-2 px-6 shadow-sm sticky top-0 z-40 no-print">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Image 
              src="https://i.postimg.cc/JhCP857V/1-removebg-preview.png"
              alt="شعار"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <h1 className="text-xl font-bold text-foreground">نظام شئون ضباط هيئة الاستخبارات العسكرية</h1>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>فاتح</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>داكن</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>النظام</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-5 w-5"/>
                {activeNotifications.length > 0 && 
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-card animate-pulse"></span>
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <div className="p-2">
                <div className="flex justify-between items-center mb-3 px-2">
                   <h4 className="font-bold text-foreground text-right">الإشعارات</h4>
                   {activeNotifications.length > 0 &&
                    <Button variant="link" className="text-xs h-auto p-0" onClick={clearNotifications}>تعيين الكل كمقروء</Button>
                  }
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activeNotifications.length > 0 ? activeNotifications.map((notification, index) => (
                       <DropdownMenuItem key={notification.id} className="p-2 rounded-lg cursor-pointer flex items-start gap-3">
                           <AlertTriangle className="h-5 w-5 mt-1 flex-shrink-0" />
                           <div className="flex-grow text-right">
                               <p className="text-sm font-medium">{notification.title}</p>
                               <p className="text-xs text-muted-foreground">{notification.description}</p>
                           </div>
                       </DropdownMenuItem>
                    )) : (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            لا توجد إشعارات جديدة.
                        </div>
                    )}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 rtl:space-x-reverse rounded-full p-2 h-auto">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                </div>
                {user && (
                    <div className='text-right'>
                        <p className='text-sm font-medium'>{user.name}</p>
                        <p className='text-xs text-muted-foreground'>{user.role}</p>
                    </div>
                )}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center w-full gap-2 justify-end">
                   <span>الملف الشخصي</span>
                   <UserIcon className="h-4 w-4"/>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center w-full gap-2 justify-end">
                   <span>الإعدادات</span>
                   <Settings className="h-4 w-4"/>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setLogoutModalOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center w-full gap-2 justify-end">
                  <span>تسجيل الخروج</span>
                  <LogOut className="h-4 w-4"/>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AlertDialog open={isLogoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد تسجيل الخروج؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تسجيل الخروج</AlertDialogAction>
             <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
