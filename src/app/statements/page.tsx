
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  ArrowLeft, 
  Loader2, 
  Download, 
  Printer, 
  User as UserIcon, 
  Users, 
  Building2,
  Calendar,
  CheckCircle2,
  Info,
  ChevronRight,
  Receipt,
  Send,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

interface StatementAllocation {
  residentId: string;
  residentName: string;
  roomUnit: string;
  baseRent: number;
  wifiShare: number;
  usageShare: number; // Water + Electricity
  miscShare: number;
  totalDue: number;
  billingDays: number;
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

  // Access Control check
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

  // Fetch Data
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

  // Calculation Logic
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
        billingDays: resDays
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
        
        {/* Header - Hidden on Print */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" /> Billing Statements
            </h1>
            <p className="text-muted-foreground">Generate reports and invoices for household billing.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={!selectedBill}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            {selectedBill && selectedBill.status !== 'Released' && (
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleReleaseBill} disabled={isReleasing}>
                {isReleasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Release Bill to Residents
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
          {/* Controls - Hidden on Print */}
          <div className="space-y-6 print:hidden">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Statement Settings</CardTitle>
                <CardDescription>Select period and report type.</CardDescription>
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
                            <div className="flex items-center gap-2">
                              {new Date(bill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              {bill.status === 'Released' ? (
                                <Badge variant="outline" className="text-[10px] h-4 bg-accent/10 text-accent border-accent/20">Released</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-4">Draft</Badge>
                              )}
                            </div>
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
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label>Select Resident</Label>
                    <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose resident..." />
                      </SelectTrigger>
                      <SelectContent>
                        {residents?.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.firstName} {r.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedBill && (
              <Card className="shadow-md bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Bill Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    {selectedBill.status === 'Released' ? (
                      <Badge className="bg-accent text-accent-foreground font-bold">RELEASED</Badge>
                    ) : (
                      <Badge variant="secondary">DRAFT</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedBill.status === 'Released' 
                      ? "This statement is currently visible to all residents in their portal."
                      : "This statement is private. Residents cannot see it until it is released."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Statement View */}
          <div className="lg:col-span-3">
            {!selectedBill ? (
              <Card className="h-full min-h-[400px] border-dashed flex flex-col items-center justify-center text-center p-8 text-muted-foreground bg-slate-50/50 print:hidden">
                <FileText className="h-16 w-16 mb-4 opacity-10" />
                <h3 className="text-xl font-semibold mb-2">No Statement Selected</h3>
                <p className="max-w-xs mx-auto">
                  Please select a billing period from the settings to generate a statement.
                </p>
              </Card>
            ) : viewMode === 'general' ? (
              <Card className="shadow-xl border-none print:shadow-none print:border">
                <CardHeader className="bg-primary text-primary-foreground rounded-t-lg print:bg-white print:text-black print:border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-2xl font-bold">
                        <Building2 className="h-6 w-6" /> General Billing Statement
                      </div>
                      <CardDescription className="text-primary-foreground/80 print:text-slate-500">
                        Villa 5604 - {new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-70">Total Household Bill</p>
                      <p className="text-xl font-bold">{selectedBill.total.toFixed(3)} OMR</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="rounded-md border bg-white overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Resident (Unit)</TableHead>
                          <TableHead className="text-right">Rent</TableHead>
                          <TableHead className="text-right">Wifi</TableHead>
                          <TableHead className="text-right">Usage (W/E)</TableHead>
                          <TableHead className="text-right">Misc</TableHead>
                          <TableHead className="text-right font-bold text-primary">Total OMR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementResults?.map((s, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {s.residentName} <span className="text-xs text-muted-foreground">({s.roomUnit})</span>
                            </TableCell>
                            <TableCell className="text-right">{s.baseRent.toFixed(3)}</TableCell>
                            <TableCell className="text-right">{s.wifiShare.toFixed(3)}</TableCell>
                            <TableCell className="text-right">{s.usageShare.toFixed(3)}</TableCell>
                            <TableCell className="text-right">{s.miscShare.toFixed(3)}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{s.totalDue.toFixed(3)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              selectedResidentId === 'all' ? (
                <Card className="h-full min-h-[400px] border-dashed flex flex-col items-center justify-center text-center p-8 text-muted-foreground bg-slate-50/50 print:hidden">
                  <UserIcon className="h-16 w-16 mb-4 opacity-10" />
                  <h3 className="text-xl font-semibold mb-2">Select a Resident</h3>
                  <p className="max-w-xs mx-auto">
                    Choose a specific resident from the settings to view their individual statement.
                  </p>
                </Card>
              ) : individualStatement ? (
                <div className="space-y-6">
                  <Card className="shadow-2xl border-none print:shadow-none print:border overflow-hidden">
                    <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between gap-8 print:bg-white print:text-black print:border-b print:p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary rounded-lg print:bg-slate-200">
                            <Building2 className="h-6 w-6 text-white print:text-black" />
                          </div>
                          <span className="text-2xl font-black tracking-tighter">VILLA 5604</span>
                        </div>
                        <div className="text-sm opacity-70 print:text-black print:opacity-100">
                          <p>Individual Billing Statement</p>
                          <p>Period: {new Date(selectedBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-xs uppercase tracking-widest opacity-50 print:opacity-100">Bill To</div>
                        <h2 className="text-2xl font-bold">{individualStatement.residentName}</h2>
                        <div className="text-sm opacity-70 print:opacity-100">
                          <p>Unit: {individualStatement.roomUnit}</p>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-8 print:p-6">
                      <div className="mb-12">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-2">
                          <Receipt className="h-5 w-5 text-primary" /> Breakdown of Charges
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2">
                            <div>
                              <p className="font-semibold">Base Monthly Rent</p>
                              <p className="text-xs text-muted-foreground">Fixed monthly lease amount</p>
                            </div>
                            <p className="font-mono">{individualStatement.baseRent.toFixed(3)} OMR</p>
                          </div>
                          
                          <div className="flex justify-between items-center py-2">
                            <div>
                              <p className="font-semibold">Wifi Share</p>
                              <p className="text-xs text-muted-foreground">Household connectivity split (Equal)</p>
                            </div>
                            <p className="font-mono">{individualStatement.wifiShare.toFixed(3)} OMR</p>
                          </div>

                          <div className="flex justify-between items-center py-2">
                            <div>
                              <p className="font-semibold">Utilities Usage Share</p>
                              <p className="text-xs text-muted-foreground">Water & Electricity consumption share</p>
                            </div>
                            <p className="font-mono">{individualStatement.usageShare.toFixed(3)} OMR</p>
                          </div>

                          {individualStatement.miscShare > 0 && (
                            <div className="flex justify-between items-center py-2">
                              <div>
                                <p className="font-semibold">Miscellaneous Expenses</p>
                                <p className="text-xs text-muted-foreground">Shared household supplies / maintenance</p>
                              </div>
                              <p className="font-mono">{individualStatement.miscShare.toFixed(3)} OMR</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-xl flex justify-between items-center border border-slate-200 print:bg-white">
                        <div>
                          <p className="text-xs uppercase font-black text-slate-500 tracking-wider">Total Amount Due</p>
                          <p className="text-sm text-muted-foreground italic">Please pay by the 5th of next month</p>
                        </div>
                        <div className="text-right">
                          <p className="text-4xl font-black text-primary">{individualStatement.totalDue.toFixed(3)} OMR</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
