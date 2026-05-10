
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Receipt, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Building2,
  Receipt as ReceiptIcon,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where, orderBy } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  Line, 
  LineChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

const chartConfig = {
  water: {
    label: "Water",
    color: "hsl(var(--primary))",
  },
  electricity: {
    label: "Electricity",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export default function MyBillsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const [selectedBill, setSelectedBill] = useState<any>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login');
    }
  }, [user, userLoading, router]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const billsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('status', '==', 'Released'),
      orderBy('monthYear', 'desc')
    );
  }, [db, user]);

  const { data: bills, loading: billsLoading } = useCollection(billsQuery);

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, user]);

  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

  const chartData = useMemo(() => {
    if (!bills) return [];
    return [...bills]
      .sort((a: any, b: any) => a.monthYear.localeCompare(b.monthYear))
      .map((bill: any) => ({
        month: bill.startDate ? new Date(bill.startDate).toLocaleDateString('en-US', { month: 'short' }) : 'N/A',
        water: bill.water || 0,
        electricity: bill.electricity || 0,
      }));
  }, [bills]);

  const calculatedStatement = useMemo(() => {
    if (!selectedBill || !residents || residents.length === 0) return null;

    const numResidents = residents.length;
    const wifiTotal = selectedBill.wifi || 0;
    const miscTotal = selectedBill.miscellaneous || 0;
    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = wifiTotal / numResidents;
    const waterSharePerDay = totalManDays > 0 ? (selectedBill.water || 0) / totalManDays : 0;
    const electricitySharePerDay = totalManDays > 0 ? (selectedBill.electricity || 0) / totalManDays : 0;
    const miscUsagePerDay = totalMiscManDays > 0 ? miscTotal / totalMiscManDays : 0;

    const list = residents.map(r => {
      const resDays = r.billingDays ?? 30;
      const isMisc = r.isMiscApplicable !== false;
      const resWifi = wifiSharePerPerson;
      const resWater = waterSharePerDay * resDays;
      const resElec = electricitySharePerDay * resDays;
      const resMisc = isMisc ? (miscUsagePerDay * resDays) : 0;
      const baseRent = r.monthlyRent || 0;
      const totalShare = baseRent + resWifi + resWater + resElec + resMisc;
      
      return {
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        room: r.roomUnit || 'N/A',
        baseRent,
        wifi: resWifi,
        water: resWater,
        electricity: resElec,
        misc: resMisc,
        total: totalShare,
        isMe: r.id === user?.uid,
        isPaid: selectedBill.paidResidents?.includes(r.id)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const myEntry = list.find(l => l.isMe);
    return { list, myEntry };
  }, [selectedBill, residents, user]);

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${new Date(start).toLocaleDateString('en-US', options)} - ${new Date(end).toLocaleDateString('en-US', options)}`;
  };

  if (userLoading || profileLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Receipt className="h-8 w-8" /> My Bills
          </h1>
        </div>

        {bills && bills.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {bills.map((bill: any) => {
              const isPaid = bill.paidResidents?.includes(user?.uid);
              return (
                <Card key={bill.id} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <CalendarRange className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{formatDateRange(bill.startDate, bill.endDate)}</h3>
                          <p className="text-sm font-bold text-primary mt-1">Household Total: {(bill.total || 0).toFixed(3)} OMR</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <Badge className="bg-accent text-accent-foreground gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed bg-white">
            <ReceiptIcon className="h-12 w-12 mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No Released Bills Found</h3>
            <p className="text-sm text-muted-foreground">Statements appear here once released by management.</p>
          </Card>
        )}

        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            {selectedBill && (
              <>
                <DialogHeader className="p-6 border-b bg-slate-50">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <CalendarRange className="h-6 w-6 text-primary" />
                    {formatDateRange(selectedBill.startDate, selectedBill.endDate)}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-0 flex flex-col">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="px-6 pt-4 bg-white border-b sticky top-0 z-10">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="personal" className="gap-2"><ReceiptIcon className="h-4 w-4" /> My Statement</TabsTrigger>
                        <TabsTrigger value="community" className="gap-2"><Users className="h-4 w-4" /> Community View</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="personal" className="p-6">
                      {calculatedStatement?.myEntry ? (
                        <Card className="shadow-xl overflow-hidden border">
                          <div className="p-8 bg-slate-50 flex justify-between border-b">
                            <div className="space-y-4">
                              <div className="text-2xl font-black text-primary">VILLA 5604</div>
                              <p className="text-xs font-medium text-muted-foreground">{formatDateRange(selectedBill.startDate, selectedBill.endDate)}</p>
                            </div>
                            <div className="text-right">
                              <h2 className="text-2xl font-bold">{calculatedStatement.myEntry.name}</h2>
                              <p className="text-sm font-medium text-muted-foreground">Unit {calculatedStatement.myEntry.room}</p>
                              <div className="mt-4">{calculatedStatement.myEntry.isPaid ? <Badge className="bg-accent text-accent-foreground">PAID</Badge> : <Badge variant="destructive">PENDING</Badge>}</div>
                            </div>
                          </div>
                          <CardContent className="p-8">
                            <div className="space-y-4 mb-8">
                              {[
                                { label: 'Base Rent', val: calculatedStatement.myEntry.baseRent },
                                { label: 'Wifi Share', val: calculatedStatement.myEntry.wifi },
                                { label: 'Water Share', val: calculatedStatement.myEntry.water },
                                { label: 'Electricity Share', val: calculatedStatement.myEntry.electricity },
                                { label: 'Misc Share', val: calculatedStatement.myEntry.misc },
                              ].map(item => (
                                <div key={item.label} className="flex justify-between border-b pb-2">
                                  <span className="text-slate-600">{item.label}</span>
                                  <span className="font-mono font-bold">{item.val.toFixed(3)} OMR</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-slate-50 p-6 rounded-xl flex justify-between items-center border">
                              <span className="font-black text-slate-500 uppercase tracking-tighter">Total Due</span>
                              <span className="text-4xl font-black text-primary">{calculatedStatement.myEntry.total.toFixed(3)} OMR</span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : <div className="p-8 text-center italic">No personal share found for this period.</div>}
                    </TabsContent>
                    <TabsContent value="community" className="p-6">
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50"><TableRow><TableHead>Resident</TableHead><TableHead>Room</TableHead><TableHead className="text-right">Share (OMR)</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {calculatedStatement?.list.map((s, idx) => (
                              <TableRow key={idx} className={s.isMe ? "bg-primary/5" : ""}>
                                <TableCell className="font-medium">{s.name} {s.isMe && <Badge variant="outline" className="ml-1 text-[10px]">You</Badge>}</TableCell>
                                <TableCell>{s.room}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{s.total.toFixed(3)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
