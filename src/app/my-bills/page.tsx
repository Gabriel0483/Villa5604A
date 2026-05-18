
"use client"

import React, { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  CheckCircle2,
  Clock,
  Receipt as ReceiptIcon,
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';

export default function MyBillsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

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

  // Fetch the latest released bill
  const latestBillQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('status', '==', 'Released'),
      orderBy('monthYear', 'desc'),
      limit(1)
    );
  }, [db, user]);

  const { data: bills, loading: billsLoading } = useCollection(latestBillQuery);
  const latestBill = bills && bills.length > 0 ? bills[0] : null;

  const myEntry = useMemo(() => {
    if (!latestBill || !user) return null;
    if (latestBill.itemizedStatements) {
      return latestBill.itemizedStatements.find((s: any) => s.residentId === user.uid);
    }
    return null;
  }, [latestBill, user]);

  const isPaid = useMemo(() => {
    if (!latestBill || !user) return false;
    return latestBill.paidResidents?.includes(user.uid);
  }, [latestBill, user]);

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${new Date(start).toLocaleDateString('en-US', options)} - ${new Date(end).toLocaleDateString('en-US', options)}`;
  };

  if (userLoading || profileLoading || billsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">Syncing Statement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center text-[10px] font-black text-slate-600 hover:text-primary transition-colors group uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Dashboard
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
              <div className="p-2 md:p-3 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
                <ReceiptIcon className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              My Bill
            </h1>
          </div>
        </div>

        {latestBill && myEntry ? (
          <div className="space-y-6 animate-in fade-in duration-700">
            <Card className="shadow-2xl overflow-hidden border-none rounded-2xl md:rounded-[2.5rem] bg-white">
              <div className="p-8 md:p-12 bg-indigo-600 flex flex-col md:flex-row justify-between items-center text-white gap-6">
                <div className="space-y-1 md:space-y-2 text-center md:text-left">
                  <div className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">Villa 5604</div>
                  <p className="text-[8px] md:text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">Residential Portal</p>
                </div>
                <div className="text-center md:text-right space-y-1 md:space-y-2">
                  <h2 className="text-xl md:text-2xl font-black leading-none text-indigo-50">{myEntry.residentName}</h2>
                  <p className="text-xs md:text-sm font-bold text-white/80">Room Unit: {myEntry.roomUnit || 'N/A'}</p>
                  <div className="pt-2">
                    {isPaid ? 
                      <Badge className="bg-white text-emerald-600 font-black px-5 py-1.5 rounded-full uppercase text-[9px] tracking-widest">PAID</Badge> : 
                      <Badge className="bg-rose-500 text-white font-black px-5 py-1.5 rounded-full uppercase text-[9px] tracking-widest border-none">PAYMENT DUE</Badge>
                    }
                  </div>
                </div>
              </div>
              <CardContent className="p-8 md:p-12">
                <div className="mb-6">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Cycle Period</p>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    {formatDateRange(latestBill.startDate, latestBill.endDate)}
                  </h3>
                </div>
                
                <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                  <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest border-b pb-3 mb-4">Itemized Charges</h3>
                  {[
                    { label: 'Base Rent', val: myEntry.baseRent },
                    { label: 'Wifi Share', val: myEntry.wifi },
                    { label: 'Water Share', val: myEntry.water },
                    { label: 'Electricity Share', val: myEntry.electricity },
                    { label: 'Miscellaneous', val: myEntry.misc },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1 group">
                      <span className="text-slate-600 font-bold uppercase text-[10px] tracking-widest group-hover:text-slate-900 transition-colors">{item.label}</span>
                      <span className="font-mono font-black text-slate-900 text-base md:text-2xl shrink-0">{item.val.toFixed(3)} OMR</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-slate-900 p-8 md:p-12 rounded-2xl md:rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden gap-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <div className="flex flex-col gap-1 items-center md:items-start relative z-10">
                    <span className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Total Due for Cycle</span>
                    <span className="text-3xl md:text-6xl font-black text-white tracking-tighter">
                      {myEntry.total.toFixed(3)} <span className="text-sm md:text-xl text-slate-500 font-bold">OMR</span>
                    </span>
                  </div>
                  <Button className="relative z-10 gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-indigo-900/50 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                    <CreditCard className="h-4 w-4" /> Pay via Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="p-12 md:p-20 text-center border-dashed bg-white shadow-sm border-slate-300 rounded-2xl md:rounded-[2rem]">
            <ReceiptIcon className="h-16 w-16 md:h-24 md:w-24 mx-auto text-slate-200 mb-6 md:mb-8" />
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">No Active Bill</h3>
            <p className="text-xs md:text-sm text-slate-600 font-bold max-w-sm mx-auto mt-4 leading-relaxed">
              Your latest statement will appear here once released by the management.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
