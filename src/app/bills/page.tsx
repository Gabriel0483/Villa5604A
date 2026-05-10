
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
  AlertCircle,
  Printer,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
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
    const waterTotal = selectedBill.water || 0;
    const elecTotal = selectedBill.electricity || 0;
    const miscTotal = selectedBill.miscellaneous || 0;

    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = wifiTotal / numResidents;
    const waterSharePerDay = totalManDays > 0 ? waterTotal / totalManDays : 0;
    const electricitySharePerDay = totalManDays > 0 ? elecTotal / totalManDays : 0;
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

  const handlePrint = () => {
    window.print();
  };

  if (userLoading || profileLoading || (billsLoading && bills === null)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">Fetching Your Statements...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center text-xs font-black text-slate-600 hover:text-primary transition-colors group uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
          </Link>
          <h1 className="text-5xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm">
              <Receipt className="h-10 w-10" />
            </div>
            My Bills
          </h1>
        </div>

        {bills && bills.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {bills.map((bill: any) => {
              const isPaid = bill.paidResidents?.includes(user?.uid);
              return (
                <Card key={bill.id} className="hover:shadow-2xl transition-all cursor-pointer group bg-white border-slate-200 overflow-hidden transform hover:-translate-y-1 rounded-[2rem]" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                          <CalendarRange className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatDateRange(bill.startDate, bill.endDate)}</h3>
                          <p className="text-xs font-black text-indigo-600 mt-1 uppercase tracking-widest">Household Cycle Statement</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isPaid ? (
                          <Badge className="bg-emerald-500 text-white font-black gap-1.5 px-5 py-2 rounded-full uppercase text-[10px] tracking-widest">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-black gap-1.5 px-5 py-2 rounded-full uppercase text-[10px] tracking-widest">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <ChevronRight className="h-7 w-7 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-20 text-center border-dashed bg-white shadow-sm border-slate-300 rounded-[2rem]">
            <ReceiptIcon className="h-24 w-24 mx-auto text-slate-200 mb-8" />
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">No Released Bills Found</h3>
            <p className="text-sm text-slate-600 font-bold max-w-sm mx-auto mt-4 leading-relaxed">
              Itemized statements will appear here automatically once released by management for the current cycle.
            </p>
          </Card>
        )}

        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2.5rem] print:shadow-none print:rounded-none">
            {selectedBill && (
              <>
                <DialogHeader className="p-10 border-b bg-slate-900 text-white flex-row items-center justify-between print:bg-white print:text-slate-900 print:p-4">
                  <div className="space-y-1">
                    <DialogTitle className="text-4xl font-black flex items-center gap-4 text-white tracking-tighter print:text-slate-900">
                      Statement
                    </DialogTitle>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] print:text-slate-500">
                      {formatDateRange(selectedBill.startDate, selectedBill.endDate)}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={handlePrint} className="text-white hover:bg-white/10 hover:text-white font-black uppercase text-[10px] tracking-widest print:hidden">
                    <Printer className="h-4 w-4 mr-2" /> Print Statement
                  </Button>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-0 flex flex-col bg-slate-50">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="px-10 pt-8 bg-white border-b sticky top-0 z-10 print:hidden">
                      <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-slate-100 rounded-2xl p-1.5">
                        <TabsTrigger value="personal" className="gap-2 font-black text-[11px] uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                          <ReceiptIcon className="h-4 w-4" /> My Individual Share
                        </TabsTrigger>
                        <TabsTrigger value="community" className="gap-2 font-black text-[11px] uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                          <Users className="h-4 w-4" /> Itemized General List
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="personal" className="p-10 mt-0">
                      {calculatedStatement?.myEntry ? (
                        <div className="space-y-8 animate-in fade-in duration-700">
                          <Card className="shadow-2xl overflow-hidden border-none rounded-[2.5rem] bg-white">
                            <div className="p-12 bg-indigo-600 flex justify-between items-center text-white">
                              <div className="space-y-2">
                                <div className="text-4xl font-black italic tracking-tighter">VILLA 5604</div>
                                <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">RESIDENTIAL PORTAL</p>
                              </div>
                              <div className="text-right space-y-2">
                                <h2 className="text-2xl font-black leading-none">{calculatedStatement.myEntry.name}</h2>
                                <p className="text-sm font-bold text-white/80">Room Unit: {calculatedStatement.myEntry.room}</p>
                                <div className="pt-4">
                                  {calculatedStatement.myEntry.isPaid ? 
                                    <Badge className="bg-white text-emerald-600 font-black px-6 py-2 rounded-full uppercase text-[10px] tracking-widest">PAID</Badge> : 
                                    <Badge className="bg-rose-500 text-white font-black px-6 py-2 rounded-full uppercase text-[10px] tracking-widest">PAYMENT DUE</Badge>
                                  }
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-12">
                              <div className="space-y-6 mb-12">
                                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest border-b pb-4 mb-8">Itemized Charges</h3>
                                {[
                                  { label: 'Base Rent (Monthly)', val: calculatedStatement.myEntry.baseRent },
                                  { label: 'Wifi (Equal Share)', val: calculatedStatement.myEntry.wifi },
                                  { label: 'Water (Man-Days Pro-rata)', val: calculatedStatement.myEntry.water },
                                  { label: 'Electricity (Man-Days Pro-rata)', val: calculatedStatement.myEntry.electricity },
                                  { label: 'Misc (Applicable Split)', val: calculatedStatement.myEntry.misc },
                                ].map(item => (
                                  <div key={item.label} className="flex justify-between items-center py-1 group">
                                    <span className="text-slate-600 font-bold uppercase text-[11px] tracking-widest group-hover:text-slate-900 transition-colors">{item.label}</span>
                                    <span className="font-mono font-black text-slate-900 text-xl">{item.val.toFixed(3)} OMR</span>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-slate-900 p-10 rounded-[2rem] flex justify-between items-center shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <span className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px] relative z-10">Total Due for Cycle</span>
                                <span className="text-5xl font-black text-white tracking-tighter relative z-10">{calculatedStatement.myEntry.total.toFixed(3)} <span className="text-xl text-slate-500 font-bold">OMR</span></span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="p-24 text-center bg-white rounded-[2.5rem] shadow-lg border border-slate-100">
                          <AlertCircle className="h-16 w-16 mx-auto text-slate-300 mb-8" />
                          <p className="text-slate-900 font-black text-2xl tracking-tight">Personal Statement Missing</p>
                          <p className="text-slate-600 font-bold mt-2">No individual breakdown found for your account in this cycle.</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="community" className="p-10 mt-0">
                      <div className="rounded-[2rem] border-none overflow-hidden bg-white shadow-2xl">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-widest px-10 py-6">Resident</TableHead>
                              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Room</TableHead>
                              <TableHead className="text-right font-black text-slate-900 uppercase text-[10px] tracking-widest px-10">Total Share (OMR)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calculatedStatement?.list.map((s, idx) => (
                              <TableRow key={idx} className={cn("transition-colors group", s.isMe ? "bg-indigo-50/50" : "hover:bg-slate-50")}>
                                <TableCell className="font-bold text-slate-900 px-10 py-8">
                                  <div className="flex items-center gap-2">
                                    {s.name} 
                                    {s.isMe && <Badge className="bg-indigo-600 text-[8px] font-black uppercase tracking-tighter">YOU</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell className="font-black text-slate-500 uppercase text-xs">{s.room}</TableCell>
                                <TableCell className="text-right font-black text-indigo-600 px-10 py-8 text-2xl tracking-tighter">{s.total.toFixed(3)}</TableCell>
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

