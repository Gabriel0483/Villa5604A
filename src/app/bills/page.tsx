
"use client"

import React, { useMemo, useState } from 'react';
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
  Info
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
        month: new Date(bill.monthYear + '-01').toLocaleDateString('en-US', { month: 'short' }),
        water: bill.water,
        electricity: bill.electricity,
      }));
  }, [bills]);

  // Calculate detailed shares for the community view and personal statement
  const calculatedStatement = useMemo(() => {
    if (!selectedBill || !residents || residents.length === 0) return null;

    const numResidents = residents.length;
    const wifiTotal = selectedBill.wifi;
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
      
      const wifiShare = wifiSharePerPerson;
      const waterShare = waterSharePerDay * resDays;
      const electricityShare = electricitySharePerDay * resDays;
      const miscShare = isMisc ? (miscUsagePerDay * resDays) : 0;
      const baseRent = r.monthlyRent || 0;
      
      const totalShare = baseRent + wifiShare + waterShare + electricityShare + miscShare;
      
      return {
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        room: r.roomUnit || 'N/A',
        baseRent,
        wifi: wifiShare,
        water: waterShare,
        electricity: electricityShare,
        misc: miscShare,
        total: totalShare,
        isMe: r.id === user?.uid,
        isPaid: selectedBill.paidResidents?.includes(r.id)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const myEntry = list.find(l => l.isMe);

    return { list, myEntry };
  }, [selectedBill, residents, user]);

  if (userLoading || profileLoading) {
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
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" /> Billing & Consumption
          </h1>
        </div>

        {bills && bills.length > 0 && (
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Household Consumption Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(value) => `${value} OMR`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="top" height={36}/>
                      <Line 
                        type="monotone" 
                        dataKey="water" 
                        stroke="var(--color-water)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: "var(--color-water)" }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="electricity" 
                        stroke="var(--color-electricity)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: "var(--color-electricity)" }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-1 pt-4">
            <ReceiptIcon className="h-5 w-5 text-slate-400" /> Statement History
          </h2>
          
          {billsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-24" />
            ))
          ) : bills && bills.length > 0 ? (
            bills.map((bill: any) => {
              const isPaid = bill.paidResidents?.includes(user?.uid);
              return (
                <Card key={bill.id} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">
                            {new Date(bill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <p className="text-sm text-muted-foreground">Household Total: {bill.total.toFixed(3)} OMR</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <Badge className="bg-accent text-accent-foreground gap-1 hidden md:flex">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground gap-1 hidden md:flex">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="p-12 text-center border-dashed">
              <ReceiptIcon className="h-12 w-12 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No Bills Found</h3>
            </Card>
          )}
        </div>

        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            {selectedBill && (
              <>
                <DialogHeader className="p-6 border-b sr-only">
                  <DialogTitle>
                    {new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-0 flex flex-col">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="px-6 pt-4 bg-white border-b sticky top-0 z-10">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="personal" className="gap-2">
                          <ReceiptIcon className="h-4 w-4" /> My Statement
                        </TabsTrigger>
                        <TabsTrigger value="community" className="gap-2">
                          <Users className="h-4 w-4" /> Community View
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <TabsContent value="personal" className="p-6 animate-in fade-in slide-in-from-top-2 focus-visible:ring-0">
                      {calculatedStatement?.myEntry ? (
                        <div className="space-y-6">
                          <Card className="shadow-2xl overflow-hidden border">
                            <div className="p-8 bg-slate-50 text-slate-900 flex justify-between border-b">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-6 w-6 text-primary" />
                                  <span className="text-2xl font-black tracking-tight text-primary">VILLA 5604</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                  {new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Bill To</p>
                                <h2 className="text-2xl font-bold text-slate-900">{calculatedStatement.myEntry.name}</h2>
                                <p className="text-sm font-medium text-muted-foreground">Unit {calculatedStatement.myEntry.room}</p>
                                <div className="mt-4">
                                  {calculatedStatement.myEntry.isPaid ? (
                                    <Badge className="bg-accent text-accent-foreground">PAID</Badge>
                                  ) : (
                                    <Badge variant="destructive">PENDING PAYMENT</Badge>
                                  )}
                                </div>
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
                                    <span className="font-mono font-bold text-slate-900">{item.val.toFixed(3)} OMR</span>
                                  </div>
                                ))}
                              </div>

                              <div className="bg-slate-50 p-6 rounded-xl flex justify-between items-center border">
                                <span className="font-black text-slate-500 uppercase tracking-tighter">Total Due</span>
                                <span className="text-4xl font-black text-primary">{calculatedStatement.myEntry.total.toFixed(3)} OMR</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground italic">
                          No personal share data found for this period.
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="community" className="p-6 animate-in fade-in slide-in-from-top-2 focus-visible:ring-0">
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead>Resident</TableHead>
                              <TableHead>Room</TableHead>
                              <TableHead className="text-right">Share (OMR)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {residentsLoading ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                            ) : calculatedStatement?.list.map((s, idx) => (
                              <TableRow key={idx} className={s.isMe ? "bg-primary/5" : ""}>
                                <TableCell className="font-medium">
                                  {s.name} {s.isMe && <Badge variant="outline" className="ml-1 text-[10px] h-4">You</Badge>}
                                </TableCell>
                                <TableCell>{s.room}</TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                  {s.total.toFixed(3)}
                                </TableCell>
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
