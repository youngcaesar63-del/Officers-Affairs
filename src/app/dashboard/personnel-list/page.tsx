
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonnelTable } from '@/components/dashboard/personnel-table';
import { getAllPersonnel } from '@/lib/data';

export default async function PersonnelListPage() {
  const personnel = await getAllPersonnel();

  return (
    <div className="animate-in fade-in duration-500">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">قائمة الضباط</CardTitle>
          <CardDescription>عرض وإدارة بيانات جميع الضباط المسجلين في النظام.</CardDescription>
        </CardHeader>
        <CardContent>
           <PersonnelTable data={personnel} />
        </CardContent>
      </Card>
    </div>
  );
}
