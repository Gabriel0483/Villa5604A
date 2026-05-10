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
        <p className="text-sm font-bold text-slate-800">Fetching Released Bills...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-700 hover:text-primary transition-colors group">
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
                <Card key={bill.id} className="hover:shadow-md transition-all cursor-pointer group bg-white border-slate-200" onClick={() => setSelectedBill(bill)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <CalendarRange className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{formatDateRange(bill.startDate, bill.endDate)}</h3>
                          <p className="text-sm font-black text-primary mt-1">Household Total: {(bill.total || 0).toFixed(3)} OMR</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <Badge className="bg-accent text-accent-foreground font-bold gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-900 border-slate-400 font-bold gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-16 text-center border-dashed bg-white shadow-sm border-slate-300">
            <ReceiptIcon className="h-16 w-16 mx-auto text-slate-300 mb-6" />
            <h3 className="text-xl font-bold text-slate-900">No Released Bills Found</h3>
            <p className="text-sm text-slate-700 font-medium max-w-sm mx-auto mt-2">
              Statements will appear here automatically once released by management for the current billing cycle.
            </p>
          </Card>
        )}

        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
            {selectedBill && (
              <>
                <DialogHeader className="p-6 border-b bg-slate-100">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                    <CalendarRange className="h-6 w-6" />
                    {formatDateRange(selectedBill.startDate, selectedBill.endDate)}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-0 flex flex-col">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="px-6 pt-4 bg-white border-b sticky top-0 z-10">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="personal" className="gap-2 font-bold"><ReceiptIcon className="h-4 w-4" /> My Statement</TabsTrigger>
                        <TabsTrigger value="community" className="gap-2 font-bold"><Users className="h-4 w-4" /> Community View</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="personal" className="p-6">
                      {calculatedStatement?.myEntry ? (
                        <Card className="shadow-lg overflow-hidden border border-slate-200">
                          <div className="p-8 bg-slate-50 flex justify-between border-b border-slate-200">
                            <div className="space-y-4">
                              <div className="text-2xl font-black text-primary">VILLA 5604</div>
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{formatDateRange(selectedBill.startDate, selectedBill.endDate)}</p>
                            </div>
                            <div className="text-right">
                              <h2 className="text-2xl font-bold text-slate-900">{calculatedStatement.myEntry.name}</h2>
                              <p className="text-sm font-bold text-slate-700">Unit {calculatedStatement.myEntry.room}</p>
                              <div className="mt-4">{calculatedStatement.myEntry.isPaid ? <Badge className="bg-accent text-accent-foreground font-black">PAID</Badge> : <Badge variant="destructive" className="font-black">PENDING</Badge>}</div>
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
                                <div key={item.label} className="flex justify-between border-b border-slate-100 pb-2">
                                  <span className="text-slate-900 font-bold">{item.label}</span>
                                  <span className="font-mono font-black text-slate-900">{item.val.toFixed(3)} OMR</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-primary/5 p-6 rounded-xl flex justify-between items-center border border-primary/20">
                              <span className="font-black text-primary/80 uppercase tracking-tighter">Total Due</span>
                              <span className="text-4xl font-black text-primary">{calculatedStatement.myEntry.total.toFixed(3)} OMR</span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="p-12 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <AlertCircle className="h-10 w-10 mx-auto text-slate-500 mb-4" />
                          <p className="text-slate-900 font-bold">No individual statement found for your account in this period.</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="community" className="p-6">
                      <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-100"><TableRow><TableHead className="font-black text-slate-900">Resident</TableHead><TableHead className="font-black text-slate-900">Room</TableHead><TableHead className="text-right font-black text-slate-900">Share (OMR)</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {calculatedStatement?.list.map((s, idx) => (
                              <TableRow key={idx} className={s.isMe ? "bg-primary/10" : ""}>
                                <TableCell className="font-bold text-slate-900">{s.name} {s.isMe && <Badge variant="outline" className="ml-1 text-[10px] text-primary border-primary font-black">You</Badge>}</TableCell>
                                <TableCell className="font-medium text-slate-800">{s.room}</TableCell>
                                <TableCell className="text-right font-black text-primary">{s.total.toFixed(3)}</TableCell>
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