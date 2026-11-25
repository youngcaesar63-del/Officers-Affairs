
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, FileText, Loader2, FileSpreadsheet, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, TextRun, AlignmentType, BorderStyle, type ITableCellBorders } from 'docx';
import { administrations, ranks, statuses } from '@/lib/constants';
import { logActivity, getAllPersonnel } from '@/lib/data';
import type { Personnel } from '@/lib/types';
import { rankOrder } from '@/lib/constants';

const reportTypes = [
  { value: 'by-administration', label: 'تقرير حسب الإدارة' },
  { value: 'by-rank', label: 'تقرير حسب الرتبة' },
  { value: 'by-status', label: 'تقرير حسب الحالة' },
  { value: 'full-report', label: 'تقرير شامل' },
];


const confidentialityLevels = ['سري', 'سري للغاية', 'سري وشخصي', 'محظور'];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Personnel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [isPrintDialogOpen, setPrintDialogOpen] = useState(false);
  const [confidentiality, setConfidentiality] = useState(confidentialityLevels[0]);
  const [reportTitleInput, setReportTitleInput] = useState('');
  const [includeAdministration, setIncludeAdministration] = useState(false);

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast({
        title: 'خطأ',
        description: 'الرجاء اختيار نوع التقرير أولاً.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
        const personnelData = await getAllPersonnel();
        
        let filteredData = [...personnelData];

        if (reportType === 'by-administration' && filterValue && filterValue !== 'الكل') {
            filteredData = personnelData.filter(p => p.administration === filterValue);
        } else if (reportType === 'by-rank' && filterValue && filterValue !== 'الكل') {
            filteredData = personnelData.filter(p => p.rank === filterValue);
        } else if (reportType === 'by-status' && filterValue && filterValue !== 'الكل') {
            filteredData = personnelData.filter(p => p.status === filterValue);
        }
        
        const sortedData = filteredData.sort((a: any, b: any) => {
            const rankA = rankOrder[a.rank] || 99;
            const rankB = rankOrder[b.rank] || 99;
            return rankA - rankB;
        });

        setReportData(sortedData);
        
        const reportTypeLabel = reportTypes.find(rt => rt.value === reportType)?.label || '';
        await logActivity('create_report', `تم إنشاء تقرير جديد: ${reportTypeLabel}`, filterValue && filterValue !== 'الكل' ? `فلتر: ${filterValue}` : 'بدون فلتر');
        
        toast({
            title: 'نجاح',
            description: `تم إنشاء التقرير بنجاح وجاهز للطباعة والتصدير.`,
        });

    } catch (error) {
        console.error("Failed to generate report", error);
        toast({ title: 'خطأ', description: 'فشل إنشاء التقرير', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };
  
  const getFilterOptions = () => {
    switch(reportType) {
        case 'by-administration':
            return { placeholder: "اختر الإدارة", options: [...administrations, 'الكل'] };
        case 'by-rank':
            return { placeholder: "اختر الرتبة", options: [...ranks, 'الكل'] };
        case 'by-status':
            return { placeholder: "اختر الحالة", options: [...statuses, 'الكل'] };
        default:
            return null;
    }
  }
  
   const formatArabicNumber = (numStr: number | string) => {
    if (numStr === undefined || numStr === null) return '';
    const str = String(numStr);
    return str.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
  }

    const handleExport = (formatType: 'excel' | 'word') => {
        if (!reportData) return;

        const headers = ['م', 'رقم البطاقة', 'الرتبة', 'الاسم', 'الإدارة', 'الحالة'];
        
        const dataToExport = reportData.map((person, index) => {
            const displayRank = `${person.rank}${person.specialization && person.specialization !== 'لا يوجد' ? ' ' + person.specialization : ''}`;
            return {
                'م': index + 1,
                'رقم البطاقة': person.cardId,
                'الرتبة': displayRank,
                'الاسم': person.name,
                'الإدارة': person.administration,
                'الحالة': person.status,
            };
        });


        if (formatType === 'excel') {
            const reversedHeaders = [...headers].reverse();
            const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(row => {
                const newRow: any = {};
                reversedHeaders.forEach(h => {
                    newRow[h] = row[h as keyof typeof row];
                });
                return newRow;
            }), { header: reversedHeaders });
            
            worksheet['!cols'] = headers.map(() => ({ wch: 20 }));
            worksheet['!rtl'] = true;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الضباط');
            
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            saveAs(dataBlob, 'تقرير_الضباط.xlsx');

        } else if (formatType === 'word') {
            const noBorderStyle: ITableCellBorders = {
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            };

            const tableHeaderRow = new DocxTableRow({
                children: [...headers].reverse().map(headerText =>
                    new DocxTableCell({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                children: [new TextRun({ text: headerText, bold: true })],
                            }),
                        ],
                    })
                ),
            });

            const tableDataRows = dataToExport.map(row =>
                new DocxTableRow({
                    children: [...headers].reverse().map(header =>
                        new DocxTableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    bidirectional: true,
                                    children: [new TextRun({ text: String(row[header as keyof typeof row] ?? '') })],
                                }),
                            ],
                        })
                    ),
                })
            );

            const titleText = reportTitleInput.trim() || reportTypes.find(rt => rt.value === reportType)?.label || 'تقرير الضباط';

            const doc = new Document({
                sections: [
                    {
                        children: [
                            new DocxTable({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: [
                                    new DocxTableRow({
                                        children: [
                                            new DocxTableCell({
                                                borders: noBorderStyle,
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        bidirectional: true,
                                                        children: [new TextRun({ text: confidentiality, bold: true })],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { before: 200, after: 200 },
                                children: [new TextRun({ text: titleText, bold: true, size: 32 })],
                            }),
                            new DocxTable({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: [tableHeaderRow, ...tableDataRows],
                            }),
                        ],
                    },
                ],
            });

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, 'تقرير_الضباط.docx');
            });
        }
    };

    const handlePrint = () => {
        setPrintDialogOpen(false);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const filterOptions = getFilterOptions();
    const selectedReportLabel = reportTypes.find(rt => rt.value === reportType)?.label || 'التقرير';

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <Card className="shadow-md print:hidden">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        التقارير
                    </CardTitle>
                    <CardDescription>إنشاء وطباعة وتصدير تقارير الضباط.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>نوع التقرير</Label>
                            <Select
                                dir="rtl"
                                value={reportType ?? undefined}
                                onValueChange={(val) => {
                                    setReportType(val);
                                    setFilterValue(null);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر نوع التقرير" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reportTypes.map((rt) => (
                                        <SelectItem key={rt.value} value={rt.value}>
                                            {rt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {filterOptions && (
                            <div className="space-y-2">
                                <Label>تصفية النتائج</Label>
                                <Select
                                    dir="rtl"
                                    value={filterValue ?? undefined}
                                    onValueChange={setFilterValue}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={filterOptions.placeholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filterOptions.options.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Button onClick={handleGenerateReport} disabled={loading || !reportType} className="w-full md:w-auto">
                                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                إنشاء التقرير
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <Card className="shadow-md print:shadow-none print:border-0">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
                        <div>
                            <CardTitle className="text-xl">{selectedReportLabel}</CardTitle>
                            <CardDescription>
                                إجمالي النتائج: {formatArabicNumber(reportData.length)} ضابط
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => handleExport('excel')}>
                                <FileSpreadsheet className="ml-2 h-4 w-4" />
                                تصدير Excel
                            </Button>
                            <Button variant="outline" onClick={() => handleExport('word')}>
                                <FileCode className="ml-2 h-4 w-4" />
                                تصدير Word
                            </Button>
                            <Dialog open={isPrintDialogOpen} onOpenChange={setPrintDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Printer className="ml-2 h-4 w-4" />
                                        طباعة
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>إعدادات الطباعة</DialogTitle>
                                        <DialogDescription>حدد درجة السرية وعنوان التقرير قبل الطباعة.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label>درجة السرية</Label>
                                            <Select dir="rtl" value={confidentiality} onValueChange={setConfidentiality}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {confidentialityLevels.map((level) => (
                                                        <SelectItem key={level} value={level}>
                                                            {level}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="report-title">عنوان التقرير</Label>
                                            <Input
                                                id="report-title"
                                                value={reportTitleInput}
                                                onChange={(e) => setReportTitleInput(e.target.value)}
                                                placeholder={selectedReportLabel}
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <Checkbox
                                                id="include-admin"
                                                checked={includeAdministration}
                                                onCheckedChange={(checked) => setIncludeAdministration(Boolean(checked))}
                                            />
                                            <Label htmlFor="include-admin">إظهار عمود الإدارة في التقرير</Label>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
                                            إلغاء
                                        </Button>
                                        <Button onClick={handlePrint}>
                                            <Printer className="ml-2 h-4 w-4" />
                                            طباعة الآن
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="hidden print:block text-center mb-6 space-y-2">
                            <p className="text-sm font-bold underline">{confidentiality}</p>
                            <h2 className="text-xl font-bold">{reportTitleInput.trim() || selectedReportLabel}</h2>
                        </div>
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12 text-center">م</TableHead>
                                        <TableHead className="text-center border-r">رقم البطاقة</TableHead>
                                        <TableHead className="text-center border-r">الرتبة</TableHead>
                                        <TableHead className="text-center border-r">الاسم</TableHead>
                                        <TableHead className={`text-center border-r ${includeAdministration ? '' : 'print:hidden'}`}>الإدارة</TableHead>
                                        <TableHead className="text-center border-r">الحالة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.length > 0 ? (
                                        reportData.map((person, index) => {
                                            const displayRank = `${person.rank}${person.specialization && person.specialization !== 'لا يوجد' ? ' ' + person.specialization : ''}`;
                                            return (
                                                <TableRow key={person.id}>
                                                    <TableCell className="text-center">{formatArabicNumber(index + 1)}</TableCell>
                                                    <TableCell className="text-center border-r">{formatArabicNumber(person.cardId)}</TableCell>
                                                    <TableCell className="text-center border-r">{displayRank}</TableCell>
                                                    <TableCell className="text-center border-r font-medium">{person.name}</TableCell>
                                                    <TableCell className={`text-center border-r ${includeAdministration ? '' : 'print:hidden'}`}>{person.administration}</TableCell>
                                                    <TableCell className="text-center border-r">{person.status}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                لا توجد بيانات مطابقة لمعايير التقرير.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}