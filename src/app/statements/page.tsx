
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  ArrowLeft, 
  Loader2, 
  Printer, 
  User as UserIcon, 
  Building2,
  Receipt,
  Send,
  Clock,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, where, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

interface StatementAllocation {
  residentId: string;
  residentName: string;
  roomUnit: string;
  baseRent: number;
  wifiShare: number;
  usageShare: number;
  miscShare: number;
  totalDue: number;
  billingDays: number;
  isPaid: boolean;
}

export default function StatementsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [selectedResidentId, setSelectedResidentId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'general' | 'individual'>('general');
  const [isReleasing, setIsReleasing] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = [
      'rielmagpantay@gmail.com', 
      'rielmagpantay@gmail.com@villa5604.app',
      'room101@villa5604.app'
    ];
    if (adminEmails.includes(user.email?.toLowerCase() || '')) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) router.push('/login');
      else if (!isSuperAdmin) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to access billing statements."
        });
        router.push('/');
      }
    }
  }, [user, userLoading, profileLoading, isSuperAdmin, router, toast]);

  const billsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'utility_bills'), orderBy('monthYear', 'desc'));
  }, [db, isSuperAdmin]);

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, isSuperAdmin]);

  const { data: bills, loading: billsLoading } = useCollection(billsQuery);
  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

  const selectedBill = useMemo(() => {
    return bills?.find(b => b.id === selectedBillId);
  }, [bills, selectedBillId]);

  const handleReleaseBill = async () => {
    if (!db || !selectedBill || isReleasing) return;
    
    setIsReleasing(true);
    const billRef = doc(db, 'utility_bills', selectedBill.id);
    
    updateDoc(billRef, {
      status: 'Released',
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({
        title: "Bill Released",
        description: `Utility statement for ${selectedBill.monthYear} is now visible to all residents.`,
      });
    })
    .catch((err) => {
      const permissionError = new FirestorePermissionError({
        path: billRef.path,
        operation: 'update',
        requestResourceData: { status: 'Released' }
      });
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsReleasing(false);
    });
  };

  const togglePaymentStatus = async (residentId: string, currentStatus: boolean) => {
    if (!db || !selectedBill || isUpdatingPayment) return;

    setIsUpdatingPayment(residentId);
    const billRef = doc(db, 'utility_bills', selectedBill.id);

    updateDoc(billRef, {
      paidResidents: currentStatus 
        ? arrayRemove(residentId) 
        : arrayUnion(residentId),
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({
        title: currentStatus ? "Marked as Pending" : "Marked as Paid",
        description: `Payment status updated for this resident.`,
      });
    })
    .catch((err) => {
      const permissionError = new FirestorePermissionError({
        path: billRef.path,
        operation: 'update'
      });
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsUpdatingPayment(null);
    });
  };

  const statementResults = useMemo(() => {
    if (!selectedBill || !residents || residents.length === 0) return null;

    const numResidents = residents.length;
    const wifiTotal = selectedBill.wifi;
    const mainUsageTotal = (selectedBill.water || 0) + (selectedBill.electricity || 0);
    const miscTotal = selectedBill.miscellaneous || 0;
    
    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = wifiTotal / numResidents;
    const mainUsagePerDay = totalManDays > 0 ? mainUsageTotal / totalManDays : 0;
    const miscUsagePerDay = totalMiscManDays > 0 ? miscTotal / totalMiscManDays : 0;

    const paidList = selectedBill.paidResidents || [];

    const allocations: StatementAllocation[] = residents.map(r => {
      const resDays = r.billingDays ?? 30;
      const isMisc = r.isMiscApplicable !== false;
      
      const resWifiShare = wifiSharePerPerson;
      const resUsageShare = mainUsagePerDay * resDays;
      const resMiscShare = isMisc ? (miscUsagePerDay * resDays) : 0;
      const baseRent = r.monthlyRent || 0;
      
      return {
        residentId: r.id,
        residentName: `${r.firstName} ${r.lastName}`,
        roomUnit: r.roomUnit || 'N/A',
        baseRent: baseRent,
        wifiShare: resWifiShare,
        usageShare: resUsageShare,
        miscShare: resMiscShare,
        totalDue: baseRent + resWifiShare + resUsageShare + resMiscShare,
        billingDays: resDays,
        isPaid: paidList.includes(r.id)
      };
    });

    return allocations;
  }, [selectedBill, residents]);

  const individualStatement = useMemo(() => {
    if (!statementResults || selectedResidentId === 'all') return null;
    return statementResults.find(s => s.residentId === selectedResidentId);
  }, [statementResults, selectedResidentId]);

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:max-w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" /> Billing Statements
            </h1>
            <p className="text-muted-foreground">Generate reports and manage resident payment statuses.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={!selectedBill}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            {selectedBill && selectedBill.status !== 'Released' && (
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleReleaseBill} disabled={isReleasing}>
                {isReleasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Release Bill
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
          <div className="space-y-6 print:hidden">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Statement Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Billing Period</Label>
                  <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {billsLoading ? (
                        <div className="p-2 text-center text-xs"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                      ) : bills && bills.length > 0 ? (
                        bills.map((bill: any) => (
                          <SelectItem key={bill.id} value={bill.id}>
                            {new Date(bill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-xs text-muted-foreground">No bills found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>View Mode</Label>
                  <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="individual">Individual</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {viewMode === 'individual' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label>Resident</Label>
                    <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose resident..." />
                      </SelectTrigger>
                      <SelectContent>
                        {residents?.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.firstName} {r.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedBill && (
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bill Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={selectedBill.status === 'Released' ? 'bg-accent' : 'bg-slate-500'}>
                    {selectedBill.status || 'Draft'}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3">
            {!selectedBill ? (
              <Card className="h-full min-h-[400px] border-dashed flex flex-col items-center justify-center text-center p-8 text-muted-foreground bg-slate-50/50">
                <FileText className="h-16 w-16 mb-4 opacity-10" />
                <h3 className="text-xl font-semibold mb-2">No Statement Selected</h3>
              </Card>
            ) : viewMode === 'general' ? (
              <Card className="shadow-xl border-none print:border">
                <CardHeader className="bg-primary text-primary-foreground rounded-t-lg print:bg-white print:text-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-2xl font-bold">
                        <Building2 className="h-6 w-6" /> General Statement
                      </div>
                      <CardDescription className="text-primary-foreground/80">
                        {new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Resident (Unit)</TableHead>
                        <TableHead className="text-right">Total OMR</TableHead>
                        <TableHead className="text-center">Payment Status</TableHead>
                        <TableHead className="text-right print:hidden">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statementResults?.map((s, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <span className="font-medium">{s.residentName}</span>
                            <span className="text-xs text-muted-foreground ml-1">({s.roomUnit})</span>
                          </TableCell>
                          <TableCell className="text-right font-bold">{s.totalDue.toFixed(3)}</TableCell>
                          <TableCell className="text-center">
                            {s.isPaid ? (
                              <Badge className="bg-accent text-accent-foreground gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Paid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground gap-1">
                                <Circle className="h-3 w-3" /> Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right print:hidden">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={isUpdatingPayment === s.residentId}
                              onClick={() => togglePaymentStatus(s.residentId, s.isPaid)}
                            >
                              {isUpdatingPayment === s.residentId ? <Loader2 className="h-3 w-3 animate-spin" /> : (s.isPaid ? 'Undo Paid' : 'Mark Paid')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : individualStatement && (
              <Card className="shadow-2xl overflow-hidden print:border">
                <div className="p-8 bg-slate-900 text-white flex justify-between print:text-black print:bg-white">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-primary" />
                      <span className="text-2xl font-black">VILLA 5604</span>
                    </div>
                    <p className="opacity-70">{new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase opacity-50">Bill To</p>
                    <h2 className="text-2xl font-bold">{individualStatement.residentName}</h2>
                    <p className="opacity-70">Unit {individualStatement.roomUnit}</p>
                    <div className="mt-2">
                      {individualStatement.isPaid ? (
                        <Badge className="bg-accent">PAID</Badge>
                      ) : (
                        <Badge variant="destructive">PENDING PAYMENT</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-8">
                  <div className="space-y-4 mb-8">
                    {[
                      { label: 'Base Rent', val: individualStatement.baseRent },
                      { label: 'Wifi Share', val: individualStatement.wifiShare },
                      { label: 'Utilities Share', val: individualStatement.usageShare },
                      { label: 'Misc Share', val: individualStatement.miscShare },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between border-b pb-2">
                        <span>{item.label}</span>
                        <span className="font-mono">{item.val.toFixed(3)} OMR</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl flex justify-between items-center border">
                    <span className="font-black text-slate-500 uppercase">Total Due</span>
                    <span className="text-4xl font-black text-primary">{individualStatement.totalDue.toFixed(3)} OMR</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
