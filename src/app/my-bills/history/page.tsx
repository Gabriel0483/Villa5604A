
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  CalendarRange,
  ChevronRight,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

export default function StatementArchivePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredBills = useMemo(() => {
    if (!bills) return [];
    return bills.filter((b: any) => 
      b.monthYear?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.startDate?.includes(searchTerm) ||
      b.endDate?.includes(searchTerm)
    );
  }, [bills, searchTerm]);

  const calculatedStatement = useMemo(() => {
    if (!selectedBill) return null;

    if (selectedBill.itemizedStatements) {
      const list = selectedBill.itemizedStatements.map((s: any) => ({
        ...s,
        id: s.residentId,
        name: s.residentName,
        room: s.roomUnit,
        isMe: s.residentId === user?.uid,
        isPaid: selectedBill.paidResidents?.includes(s.residentId)
      })).sort((a: any, b: any) => a.name.localeCompare(b.name));

      const myEntry = list.find((l: any) => l.isMe);
      return { list, myEntry };
    }

    return null;
  }, [selectedBill, user]);

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
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">Opening Archive...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/my-bills" className="inline-flex items-center text-[10px] font-black text-slate-600 hover:text-primary transition-colors group uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> My Bills
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 flex items-center gap-3 md:gap-4 tracking-tighter">
              <div className="p-2 md:p-3 bg-indigo-100 rounded-xl md:rounded-2xl text-indigo-600 shadow-sm">
                <History className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              Archive
            </h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search month..." 
              className="pl-10 h-11 w-full md:w-[250px] bg-white border-slate-200 font-bold rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredBills.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {filteredBills.map((bill: any) => {
              const isPaid = bill.paidResidents?.includes(user?.uid);
              return (
                <Card key={bill.id} className="hover:shadow-xl transition-all cursor-pointer group bg-white border-slate-200 overflow-hidden transform hover:-translate-y-1 active:scale-98 rounded-2xl md:rounded-[2rem]" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                          <CalendarRange className="h-6 w-6 md:h-8 md:w-8" />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">{formatDateRange(bill.startDate, bill.endDate)}</h3>
                          <p className="text-[9px] md:text-xs font-black text-indigo-600 mt-0.5 md:mt-1 uppercase tracking-widest">{bill.monthYear} Cycle Snapshot</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
                        {isPaid ? (
                          <Badge className="bg-emerald-500 text-white font-black gap-1 px-3 md:px-5 py-1 md:py-2 rounded-full uppercase text-[8px] md:text-[10px] tracking-widest">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-black gap-1 px-3 md:px-5 py-1 md:py-2 rounded-full uppercase text-[8px] md:text-[10px] tracking-widest">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <ChevronRight className="hidden md:block h-7 w-7 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 md:p-20 text-center border-dashed bg-white shadow-sm border-slate-300 rounded-2xl md:rounded-[2rem]">
            <ReceiptIcon className="h-16 w-16 md:h-24 md:w-24 mx-auto text-slate-200 mb-6 md:mb-8" />
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">No Historical Records</h3>
            <p className="text-xs md:text-sm text-slate-600 font-bold max-w-sm mx-auto mt-4 leading-relaxed">
              Archived statements will appear here automatically once released by management for the corresponding cycle.
            </p>
          </Card>
        )}

        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="w-[95vw] md:max-w-[800px] max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl md:rounded-[2.5rem] print:shadow-none print:rounded-none">
            {selectedBill && (
              <>
                <DialogHeader className="p-6 md:p-10 border-b bg-slate-900 text-white flex-row items-center justify-between print:bg-white print:text-slate-900 print:p-4 shrink-0">
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl md:text-4xl font-black flex items-center gap-3 text-white tracking-tighter print:text-slate-900 leading-none">
                      Statement
                    </DialogTitle>
                    <p className="text-slate-400 font-black uppercase text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] print:text-slate-500">
                      {formatDateRange(selectedBill.startDate, selectedBill.endDate)}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={handlePrint} className="text-white hover:bg-white/10 hover:text-white font-black uppercase text-[8px] md:text-[10px] tracking-widest print:hidden px-2 md:px-4">
                    <Printer className="h-4 w-4 mr-1 md:mr-2" /> <span className="hidden sm:inline">Print Statement</span>
                  </Button>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-0 flex flex-col bg-slate-50">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="px-4 md:px-10 pt-6 md:pt-8 bg-white border-b sticky top-0 z-10 print:hidden">
                      <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8 h-10 md:h-14 bg-slate-100 rounded-xl md:rounded-2xl p-1 md:p-1.5">
                        <TabsTrigger value="personal" className="gap-1 md:gap-2 font-black text-[9px] md:text-[11px] uppercase tracking-widest rounded-lg md:rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                          <ReceiptIcon className="h-3 w-3 md:h-4 md:w-4" /> <span className="truncate">My Share</span>
                        </TabsTrigger>
                        <TabsTrigger value="community" className="gap-1 md:gap-2 font-black text-[9px] md:text-[11px] uppercase tracking-widest rounded-lg md:rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                          <Users className="h-3 w-3 md:h-4 md:w-4" /> <span className="truncate">Community</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="personal" className="p-4 md:p-10 mt-0">
                      {calculatedStatement?.myEntry ? (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
                          <Card className="shadow-2xl overflow-hidden border-none rounded-2xl md:rounded-[2.5rem] bg-white">
                            <div className="p-6 md:p-12 bg-indigo-600 flex flex-col md:flex-row justify-between items-center text-white gap-6">
                              <div className="space-y-1 md:space-y-2 text-center md:text-left">
                                <div className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">VILLA 5604</div>
                                <p className="text-[8px] md:text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">RESIDENTIAL PORTAL</p>
                              </div>
                              <div className="text-center md:text-right space-y-1 md:space-y-2">
                                <h2 className="text-xl md:text-2xl font-black leading-none text-indigo-50">{calculatedStatement.myEntry.name}</h2>
                                <p className="text-xs md:text-sm font-bold text-white/80">Room Unit: {calculatedStatement.myEntry.room}</p>
                                <div className="pt-2 md:pt-4">
                                  {calculatedStatement.myEntry.isPaid ? 
                                    <Badge className="bg-white text-emerald-600 font-black px-4 md:px-6 py-1 md:py-2 rounded-full uppercase text-[8px] md:text-[10px] tracking-widest">PAID</Badge> : 
                                    <Badge className="bg-rose-500 text-white font-black px-4 md:px-6 py-1 md:py-2 rounded-full uppercase text-[8px] md:text-[10px] tracking-widest border-none">PAYMENT DUE</Badge>
                                  }
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-6 md:p-12">
                              <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                                <h3 className="font-black text-slate-900 uppercase text-[10px] md:text-xs tracking-widest border-b pb-2 md:pb-4 mb-4 md:mb-8">Itemized Charges</h3>
                                {[
                                  { label: 'Base Rent', val: calculatedStatement.myEntry.baseRent },
                                  { label: 'Wifi Share', val: calculatedStatement.myEntry.wifi },
                                  { label: 'Water Share', val: calculatedStatement.myEntry.water },
                                  { label: 'Electricity Share', val: calculatedStatement.myEntry.electricity },
                                  { label: 'Miscellaneous', val: calculatedStatement.myEntry.misc },
                                ].map(item => (
                                  <div key={item.label} className="flex justify-between items-center py-1 group">
                                    <span className="text-slate-600 font-bold uppercase text-[9px] md:text-[11px] tracking-widest group-hover:text-slate-900 transition-colors truncate mr-2">{item.label}</span>
                                    <span className="font-mono font-black text-slate-900 text-sm md:text-xl shrink-0">{item.val.toFixed(3)} OMR</span>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-slate-900 p-6 md:p-10 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden gap-2">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <span className="font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-[10px] relative z-10">Total for Cycle</span>
                                <span className="text-3xl md:text-5xl font-black text-white tracking-tighter relative z-10">{calculatedStatement.myEntry.total.toFixed(3)} <span className="text-sm md:text-xl text-slate-500 font-bold">OMR</span></span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="p-12 md:p-24 text-center bg-white rounded-2xl md:rounded-[2.5rem] shadow-lg border border-slate-100">
                          <AlertCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-slate-300 mb-6 md:mb-8" />
                          <p className="text-slate-900 font-black text-xl md:text-2xl tracking-tight">Statement Data Missing</p>
                          <p className="text-slate-600 font-bold mt-2 text-sm">Individual snapshots are required to view historical data.</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="community" className="p-4 md:p-10 mt-0">
                      <div className="rounded-2xl md:rounded-[2rem] border-none overflow-hidden bg-white shadow-2xl">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-black text-slate-900 uppercase text-[9px] md:text-[10px] tracking-widest px-4 md:px-10 py-4 md:py-6">Resident</TableHead>
                                <TableHead className="font-black text-slate-900 uppercase text-[9px] md:text-[10px] tracking-widest">Room</TableHead>
                                <TableHead className="text-right font-black text-slate-900 uppercase text-[9px] md:text-[10px] tracking-widest px-4 md:px-10">Total (OMR)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {calculatedStatement?.list.map((s, idx) => (
                                <TableRow key={idx} className={cn("transition-colors group", s.isMe ? "bg-indigo-50/50" : "hover:bg-slate-50")}>
                                  <TableCell className="font-bold text-slate-900 px-4 md:px-10 py-4 md:py-8">
                                    <div className="flex items-center gap-2">
                                      {s.name} 
                                      {s.isMe && <Badge className="bg-indigo-600 text-[8px] font-black uppercase tracking-tighter px-1.5 py-0">YOU</Badge>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-black text-slate-500 uppercase text-[10px] md:text-xs">{s.room}</TableCell>
                                  <TableCell className="text-right font-black text-indigo-600 px-4 md:px-10 py-4 md:py-8 text-lg md:text-2xl tracking-tighter">{s.total.toFixed(3)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
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
