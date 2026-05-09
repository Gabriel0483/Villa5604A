
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
  Download,
  Printer,
  Wifi,
  Droplets,
  Lightbulb,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where, orderBy } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from 'next/link';

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

  // Residents only see released bills
  const billsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('status', '==', 'Released'),
      orderBy('monthYear', 'desc')
    );
  }, [db, user]);

  const { data: bills, loading: billsLoading } = useCollection(billsQuery);

  const calculateMyShare = (bill: any) => {
    if (!profile || !bills) return null;
    
    // Simplistic calculation logic matching pro-rata rules
    // In a production app, the specific allocation would be saved as a separate doc
    // For this MVP, we re-calculate based on the known rules
    const numResidents = bills.length > 0 ? 10 : 1; // Fallback or fetch actual resident count if needed
    // For this view, we focus on the household totals as a history
    return bill;
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" /> My Billing History
          </h1>
          <p className="text-muted-foreground">Track all released utility statements for Villa 5604.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {billsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-24" />
            ))
          ) : bills && bills.length > 0 ? (
            bills.map((bill: any) => (
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
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 hidden md:flex">
                        Released
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center border-dashed">
              <ReceiptIcon className="h-12 w-12 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No Bills Found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Historical bills will appear here once they have been verified and released by the administrator.
              </p>
            </Card>
          )}
        </div>

        {/* Bill Detail Modal */}
        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedBill && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <Building2 className="h-6 w-6 text-primary" /> 
                    {new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50 border">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase mb-1">
                        <Wifi className="h-3 w-3" /> Wifi
                      </div>
                      <p className="text-lg font-bold">{selectedBill.wifi.toFixed(3)} OMR</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 border">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase mb-1">
                        <Droplets className="h-3 w-3" /> Water
                      </div>
                      <p className="text-lg font-bold">{selectedBill.water.toFixed(3)} OMR</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 border">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase mb-1">
                        <Lightbulb className="h-3 w-3" /> Electricity
                      </div>
                      <p className="text-lg font-bold">{selectedBill.electricity.toFixed(3)} OMR</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 border">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase mb-1">
                        <Plus className="h-3 w-3" /> Misc
                      </div>
                      <p className="text-lg font-bold">{(selectedBill.miscellaneous || 0).toFixed(3)} OMR</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-primary text-primary-foreground text-center">
                    <span className="text-xs uppercase font-bold tracking-widest opacity-80">Household Total Bill</span>
                    <h2 className="text-4xl font-black">{selectedBill.total.toFixed(3)} OMR</h2>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button className="w-full gap-2" variant="outline" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" /> Print Statement
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider">
                      Please refer to the pro-rata module for individual share calculations.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
