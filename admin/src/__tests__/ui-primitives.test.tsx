import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToasterProvider, toast } from '@/components/ui/toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

describe('admin UI primitives', () => {
  afterEach(() => {
    toast.dismiss();
    cleanup();
  });

  it('renders Button variants, 44px minimum target, and disables clicks while loading', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button onClick={onClick} loading>
        حفظ التغييرات
      </Button>,
    );

    const btn = screen.getByRole('button', { name: 'حفظ التغييرات' });
    expect(btn.className).toContain('min-h-[44px]');
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');

    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();

    rerender(<Button onClick={onClick}>حفظ التغييرات</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports Input RTL pass-through, Label pairing, Card, Badge, and Skeleton', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>بطاقة تجريبية</CardTitle>
          <CardDescription>وصف البطاقة</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="verse-ref">المرجع</Label>
          <Input id="verse-ref" dir="rtl" lang="ar" defaultValue="مزمور ٢٣: ١" />
          <Badge variant="warning">تحذير</Badge>
          <Skeleton data-testid="skel" className="h-4 w-24" />
        </CardContent>
        <CardFooter>تذييل</CardFooter>
      </Card>,
    );

    const input = screen.getByLabelText('المرجع');
    expect(input.getAttribute('dir')).toBe('rtl');
    expect(input.getAttribute('lang')).toBe('ar');
    expect(input.className).toContain('min-h-[44px]');
    expect(screen.getByTestId('skel').className).toContain('bg-muted');
  });

  it('toggles Switch via click, Space, and Enter with accessible aria-checked', () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        aria-label="نفس النص للذكر والأنثى"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    const sw = screen.getByRole('switch', { name: 'نفس النص للذكر والأنثى' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.className).toContain('min-h-[44px]');

    fireEvent.click(sw);
    fireEvent.keyDown(sw, { key: ' ' });
    fireEvent.keyDown(sw, { key: 'Enter' });
    expect(onCheckedChange).toHaveBeenCalledTimes(3);
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, true);
  });

  it('switches Tabs panels and tracks aria-selected', () => {
    render(
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
          <TabsTrigger value="accepted">مقبولة</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">محتوى الانتظار</TabsContent>
        <TabsContent value="accepted">محتوى المقبولة</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('محتوى الانتظار')).toBeTruthy();
    expect(screen.queryByText('محتوى المقبولة')).toBeNull();

    const acceptedTab = screen.getByRole('tab', { name: 'مقبولة' });
    fireEvent.click(acceptedTab);

    expect(acceptedTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('محتوى المقبولة')).toBeTruthy();
    expect(screen.queryByText('محتوى الانتظار')).toBeNull();
  });

  it('enforces Dialog non-dismissible mode and allows Escape when dismissible', () => {
    const onBlockedChange = vi.fn();
    const { rerender } = render(
      <Dialog open dismissible={false} onOpenChange={onBlockedChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تسجيل الدخول</DialogTitle>
            <DialogDescription>مسودتك محفوظة هنا</DialogDescription>
          </DialogHeader>
          <DialogFooter>محتوى</DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onBlockedChange).not.toHaveBeenCalled();

    const onOpenChange = vi.fn();
    rerender(
      <Dialog defaultOpen={false} onOpenChange={onOpenChange}>
        <DialogTrigger>فتح</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حوار قابل للإغلاق</DialogTitle>
            <DialogDescription>وصف</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'فتح' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders AlertDialog with alertdialog role and cancels cleanly', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>حذف</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف المؤقت</AlertDialogTitle>
            <AlertDialogDescription>يمكن استعادته لاحقاً</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إبقاء العنصر</AlertDialogCancel>
            <AlertDialogAction>تأكيد الحذف المؤقت</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    const alertDialog = screen.getByRole('alertdialog');
    expect(alertDialog.getAttribute('aria-modal')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'إبقاء العنصر' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('renders Table with logical text-start alignment and Select dropdown choices', () => {
    const onValueChange = vi.fn();
    render(
      <div>
        <Select defaultValue="verse" onValueChange={onValueChange}>
          <SelectTrigger aria-label="نوع المحتوى">
            <SelectValue placeholder="اختر النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="verse">آية</SelectItem>
            <SelectItem value="blessing">بركة</SelectItem>
          </SelectContent>
        </Select>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>مزمور ٢٣</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>,
    );

    const head = screen.getByRole('columnheader', { name: 'العنوان' });
    expect(head.className).toContain('text-start');

    const trigger = screen.getByRole('combobox', { name: 'نوع المحتوى' });
    expect(trigger.textContent).toContain('آية');
    fireEvent.click(trigger);

    const blessingOption = screen.getByRole('option', { name: 'بركة' });
    fireEvent.click(blessingOption);
    expect(onValueChange).toHaveBeenCalledWith('blessing');
    expect(trigger.textContent).toContain('بركة');
  });

  it('displays Tooltip on focus/hover and renders Toaster notifications at bottom-4 end-4', () => {
    render(
      <ToasterProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" aria-label="إدراج الاسم">
                +
              </Button>
            </TooltipTrigger>
            <TooltipContent>إدراج شريحة الاسم</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ToasterProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'إدراج الاسم' });
    fireEvent.focus(trigger);
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toBe('إدراج شريحة الاسم');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);

    act(() => {
      toast.success('تم الحفظ بنجاح');
      toast.error('تعذر الاتصال');
    });

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region.className).toContain('bottom-4');
    expect(region.className).toContain('end-4');
    expect(screen.getByText('تم الحفظ بنجاح')).toBeTruthy();
    expect(screen.getByText('تعذر الاتصال')).toBeTruthy();
  });
});
