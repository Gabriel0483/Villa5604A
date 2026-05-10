
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
  Circle,
  RotateCcw,
  TrendingUp,
  Wallet,
  AlertCircle,
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  waterShare: number;
  elecShare: number;
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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
      'room101@villa5604.app',
      'admin001@villa5604.app'
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
          description: "Permission required."
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

  const handleUpdateBillStatus = async (newStatus: 'Released' | 'Draft') => {
    if (!db || !selectedBill || isUpdatingStatus) return;
    
    setIsUpdatingStatus(true);
    const billRef = doc(db, 'utility_bills', selectedBill.id);
    
    updateDoc(billRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({
        title: newStatus === 'Released' ? "Released" : "Reverted",
        description: `Status updated successfully.`,
      });
    })
    .catch((err) => {
      const permissionError = new FirestorePermissionError({
        path: billRef.path,
        operation: 'update',
        requestResourceData: { status: newStatus }
      });
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsUpdatingStatus(false);
    });
  };

  const togglePaymentStatus = async (residentId: string, currentStatus: boolean) => {
    if (!db || !selectedBill || isUpdatingPayment) return;

    setIsUpdatingPayment(residentId);
    const billRef = doc(db, 'utility_bills', selectedBill.id);

    updateDoc(billRef, {
      paidResidents: currentStatus ? arrayRemove(residentId) : arrayUnion(residentId),
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({ title: "Status Changed", description: `Resident payment updated.` });
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

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return "Select billing range...";
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${new Date(start).toLocaleDateString('en-US', options)} - ${new Date(end).toLocaleDateString('en-US', options)}`;
  };

  const statementResults = useMemo(() => {
    if (!selectedBill || !residents || residents.length === 0) return null;

    const numResidents = residents.length;
    const wifiTotal = selectedBill.wifi || 0;
    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscTotal = selectedBill.miscellaneous || 0;
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = wifiTotal / numResidents;
    const waterSharePerDay = totalManDays > 0 ? (selectedBill.water || 0) / totalManDays : 0;
    const electricitySharePerDay = totalManDays > 0 ? (selectedBill.electricity || 0) / totalManDays : 0;
    const miscUsagePerDay = totalMiscManDays > 0 ? miscTotal / totalMiscManDays : 0;

    const paidList = selectedBill.paidResidents || [];

    const allocations: StatementAllocation[] = residents.map(r => {
      const resDays = r.billingDays ?? 30;
      const isMisc = r.isMiscApplicable !== false;
      const wifiShare = wifiSharePerPerson;
      const waterShare = waterSharePerDay * resDays;
      const elecShare = electricitySharePerDay * resDays;
      const miscShare = isMisc ? (miscUsagePerDay * resDays) : 0;
      const baseRent = r.monthlyRent || 0;
      
      return {
        residentId: r.id,
        residentName: `${r.firstName} ${r.lastName}`,
        roomUnit: r.roomUnit || 'N/A',
        baseRent,
        wifiShare,
        waterShare,
        elecShare,
        miscShare,
        totalDue: baseRent + wifiShare + waterShare + elecShare + miscShare,
        billingDays: resDays,
        isPaid: paidList.includes(r.id)
      };
    });

    return allocations;
  }, [selectedBill, residents]);

  const collectionStats = useMemo(() => {
    if (!statementResults) return null;
    const totalTarget = statementResults.reduce((acc, s) => acc + s.totalDue, 0);
    const totalCollected = statementResults.filter(s => s.isPaid).reduce((acc, s) => acc + s.totalDue, 0);
    const totalPending = totalTarget - totalCollected;
    const percentCollected = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;
    const paidCount = statementResults.filter(s => s.isPaid).length;
    const totalCount = statementResults.length;
    return { totalTarget, totalCollected, totalPending, percentCollected, paidCount, totalCount };
  }, [statementResults]);

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
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <FileText className="h-8 w-8" /> Billing Statements
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} disabled={!selectedBill}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            {selectedBill && (
              selectedBill.status !== 'Released' ? (
                <Button className="bg-accent text-accent-foreground" onClick={() => handleUpdateBillStatus('Released')} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Release Bill
                </Button>
              ) : (
                <Button variant="outline" className="text-destructive" onClick={() => handleUpdateBillStatus('Draft')} disabled={isUpdatingStatus}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Undo Release
                </Button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
          <div className="space-y-6 print:hidden">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader><CardTitle className="text-lg">Billing Cycle</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Period Range</Label>
                  <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                    <SelectTrigger><SelectValue placeholder="Choose range..." /></SelectTrigger>
                    <SelectContent>
                      {billsLoading ? <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin" /></div> : bills?.map((bill: any) => (
                        <SelectItem key={bill.id} value={bill.id}>{formatDateRange(bill.startDate, bill.endDate)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>View Type</Label>
                  <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">Summary</TabsTrigger>
                      <TabsTrigger value="individual">Detailed</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {viewMode === 'individual' && (
                  <div className="space-y-2">
                    <Label>Resident</Label>
                    <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                      <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
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
          </div>

          <div className="lg:col-span-3 space-y-6">
            {!selectedBill ? (
              <Card className="h-full min-h-[400px] border-dashed flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-10" />
                <h3 className="text-xl font-semibold">Select Billing Range</h3>
              </Card>
            ) : viewMode === 'general' ? (
              <Card className="shadow-xl">
                <CardHeader className="bg-primary text-primary-foreground rounded-t-lg print:bg-white print:text-black">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-6 w-6" /> Period Summary
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    {formatDateRange(selectedBill.startDate, selectedBill.endDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Resident</TableHead>
                        <TableHead className="text-right">Total OMR</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right print:hidden">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statementResults?.map((s, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{s.residentName} ({s.roomUnit})</TableCell>
                          <TableCell className="text-right font-bold">{s.totalDue.toFixed(3)}</TableCell>
                          <TableCell className="text-center">
                            {s.isPaid ? <Badge className="bg-accent text-accent-foreground">Paid</Badge> : <Badge variant="outline">Pending</Badge>}
                          </TableCell>
                          <TableCell className="text-right print:hidden">
                            <Button variant="ghost" size="sm" onClick={() => togglePaymentStatus(s.residentId, s.isPaid)}>
                              {s.isPaid ? 'Reset' : 'Mark Paid'}
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
                <div className="p-8 bg-slate-50 flex justify-between border-b print:bg-white">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-2xl">VILLA 5604</div>
                    <p className="text-xs font-medium text-muted-foreground">{formatDateRange(selectedBill.startDate, selectedBill.endDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Statement For</p>
                    <h2 className="text-2xl font-bold">{individualStatement.residentName}</h2>
                    <p className="text-sm font-medium text-muted-foreground">Unit {individualStatement.roomUnit}</p>
                  </div>
                </div>
                <CardContent className="p-8">
                  <div className="space-y-4 mb-8">
                    {[
                      { label: 'Base Rent', val: individualStatement.baseRent },
                      { label: 'Wifi Share', val: individualStatement.wifiShare },
                      { label: 'Water Share', val: individualStatement.waterShare },
                      { label: 'Electricity Share', val: individualStatement.elecShare },
                      { label: 'Misc Share', val: individualStatement.miscShare },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between border-b pb-2">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-mono font-bold">{item.val.toFixed(3)} OMR</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl flex justify-between items-center border">
                    <span className="font-black text-slate-500 uppercase tracking-tighter">Amount Due</span>
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
