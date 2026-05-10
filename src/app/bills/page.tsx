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
  CalendarRange,
  AlertCircle
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

  if (userLoading || profileLoading || (billsLoading && bills === null)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-800 uppercase tracking-widest">Fetching Released Bills...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center text-xs font-black text-slate-500 hover:text-primary transition-colors group uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
              <Receipt className="h-9 w-9" />
            </div>
            My Bills
          </h1>
        </div>

        {bills && bills.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {bills.map((bill: any) => {
              const isPaid = bill.paidResidents?.includes(user?.uid);
              return (
                <Card key={bill.id} className="hover:shadow-xl transition-all cursor-pointer group bg-white border-slate-200 overflow-hidden transform hover:-translate-y-1" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                          <CalendarRange className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">{formatDateRange(bill.startDate, bill.endDate)}</h3>
                          <p className="text-sm font-black text-indigo-600 mt-1 uppercase tracking-widest">Household Total: {(bill.total || 0).toFixed(3)} OMR</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isPaid ? (
                          <Badge className="bg-emerald-500 text-white font-black gap-1 px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-black gap-1 px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-20 text-center border-dashed bg-white shadow-sm border-slate-300 rounded-[2rem]">
            <ReceiptIcon className="h-20 w-20 mx-auto text-slate-200 mb-8" />
            <h3 className="text-2xl font-black text-slate-900">No Released Bills Found</h3>
            <p className="text-sm text-slate-600 font-bold max-w-sm mx-auto mt-4 leading-relaxed">
              Statements will appear here automatically once released by management for the current billing cycle.
            </p>
          </Card>
        )}

        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2rem]">
            {selectedBill && (
              <>
                <DialogHeader className="p-8 border-b bg-slate-50">
                  <DialogTitle className="text-3xl font-black flex items-center gap-3 text-slate-900 tracking-tighter">
                    <CalendarRange className="h-8 w-8 text-primary" />
                    {formatDateRange(selectedBill.startDate, selectedBill.endDate)}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-0 flex flex-col">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="px-8 pt-6 bg-white border-b sticky top-0 z-10">
                      <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-slate-100 rounded-xl p-1">
                        <TabsTrigger value="personal" className="gap-2 font-black text-xs uppercase tracking-widest rounded-lg"><ReceiptIcon className="h-4 w-4" /> My Statement</TabsTrigger>
                        <TabsTrigger value="community" className="gap-2 font-black text-xs uppercase tracking-widest rounded-lg"><Users className="h-4 w-4" /> Community View</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="personal" className="p-8">
                      {calculatedStatement?.myEntry ? (
                        <Card className="shadow-2xl overflow-hidden border border-slate-200 rounded-[2rem]">
                          <div className="p-10 bg-gradient-to-br from-indigo-500 to-indigo-700 flex justify-between border-b border-indigo-600">
                            <div className="space-y-4">
                              <div className="text-3xl font-black text-white italic tracking-tighter">VILLA 5604</div>
                              <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">{formatDateRange(selectedBill.startDate, selectedBill.endDate)}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <h2 className="text-2xl font-black text-white leading-none">{calculatedStatement.myEntry.name}</h2>
                              <p className="text-sm font-bold text-white/90">Unit {calculatedStatement.myEntry.room}</p>
                              <div className="mt-4">{calculatedStatement.myEntry.isPaid ? <Badge className="bg-white text-emerald-600 font-black border-none px-6 py-2 rounded-full uppercase text-[10px] tracking-[0.2em]">PAID</Badge> : <Badge className="bg-rose-500 text-white font-black border-none px-6 py-2 rounded-full uppercase text-[10px] tracking-[0.2em]">PENDING</Badge>}</div>
                            </div>
                          </div>
                          <CardContent className="p-10 bg-white">
                            <div className="space-y-5 mb-10">
                              {[
                                { label: 'Base Rent', val: calculatedStatement.myEntry.baseRent },
                                { label: 'Wifi Share', val: calculatedStatement.myEntry.wifi },
                                { label: 'Water Share', val: calculatedStatement.myEntry.water },
                                { label: 'Electricity Share', val: calculatedStatement.myEntry.electricity },
                                { label: 'Misc Share', val: calculatedStatement.myEntry.misc },
                              ].map(item => (
                                <div key={item.label} className="flex justify-between border-b border-slate-100 pb-3">
                                  <span className="text-slate-900 font-bold uppercase text-[11px] tracking-widest">{item.label}</span>
                                  <span className="font-mono font-black text-slate-900 text-lg">{item.val.toFixed(3)} OMR</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-slate-900 p-8 rounded-[1.5rem] flex justify-between items-center shadow-inner">
                              <span className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">Total Due</span>
                              <span className="text-4xl font-black text-white tracking-tighter">{calculatedStatement.myEntry.total.toFixed(3)} OMR</span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="p-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                          <AlertCircle className="h-12 w-12 mx-auto text-slate-400 mb-6" />
                          <p className="text-slate-900 font-black text-lg">No individual statement found for your account in this period.</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="community" className="p-8">
                      <div className="rounded-[1.5rem] border border-slate-200 overflow-hidden bg-white shadow-lg">
                        <Table>
                          <TableHeader className="bg-slate-100">
                            <TableRow>
                              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-widest px-8">Resident</TableHead>
                              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Room</TableHead>
                              <TableHead className="text-right font-black text-slate-900 uppercase text-[10px] tracking-widest px-8">Share (OMR)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calculatedStatement?.list.map((s, idx) => (
                              <TableRow key={idx} className={cn("transition-colors", s.isMe ? "bg-indigo-50/50" : "")}>
                                <TableCell className="font-bold text-slate-900 px-8 py-6">
                                  {s.name} {s.isMe && <Badge variant="outline" className="ml-2 text-[8px] text-primary border-primary font-black uppercase tracking-widest">You</Badge>}
                                </TableCell>
                                <TableCell className="font-black text-slate-600 uppercase text-xs">{s.room}</TableCell>
                                <TableCell className="text-right font-black text-primary px-8 py-6 text-lg">{s.total.toFixed(3)}</TableCell>
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