
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calculator, 
  ArrowLeft, 
  Loader2, 
  Users, 
  Receipt, 
  CheckCircle2, 
  ChevronRight,
  Download,
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, where } from 'firebase/firestore';
import Link from 'next/link';

interface LocalAllocationResult {
  methodology: string;
  allocations: Array<{
    residentName: string;
    amount: number;
    explanation: string;
  }>;
  totalAllocated: number;
}

export default function ProRataPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [allocationResults, setAllocationResults] = useState<LocalAllocationResult | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ['rielmagpantay@gmail.com', 'rielmagpantay@gmail.com@villa5604.app', 'room101@villa5604.app'];
    if (adminEmails.includes(user.email?.toLowerCase() || '')) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) router.push('/login');
      else if (!isSuperAdmin) {
        toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access the Pro-Rata module." });
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

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return "Select billing range...";
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${new Date(start).toLocaleDateString('en-US', options)} - ${new Date(end).toLocaleDateString('en-US', options)}`;
  };

  const handleCalculate = () => {
    if (!selectedBill || !residents || residents.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Ensure you have a record selected and active residents." });
      return;
    }

    setIsCalculating(true);
    setAllocationResults(null);

    setTimeout(() => {
      try {
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

        const allocations = residents.map(r => {
          const resDays = r.billingDays ?? 30;
          const isMisc = r.isMiscApplicable !== false;
          
          const resWifiShare = wifiSharePerPerson;
          const resMainUsageShare = mainUsagePerDay * resDays;
          const resMiscShare = isMisc ? (miscUsagePerDay * resDays) : 0;
          
          const resTotalShare = resWifiShare + resMainUsageShare + resMiscShare;

          let explanation = `Wifi: ${resWifiShare.toFixed(3)}. Usage: ${resMainUsageShare.toFixed(3)}.`;
          if (isMisc && miscTotal > 0) explanation += ` Misc: ${resMiscShare.toFixed(3)}.`;

          return {
            residentName: `${r.firstName} ${r.lastName}`,
            amount: resTotalShare,
            explanation: explanation
          };
        });

        const totalAllocated = allocations.reduce((acc, curr) => acc + curr.amount, 0);

        setAllocationResults({
          methodology: "Calculated by total household billing days within the selected active date range.",
          allocations: allocations,
          totalAllocated: totalAllocated
        });
      } catch (error) {
        toast({ variant: "destructive", title: "Calculation Error", description: "An error occurred while processing." });
      } finally {
        setIsCalculating(false);
      }
    }, 500); 
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" /> Pro-Rata Allocation
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Active Range Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Billing Period</Label>
                  <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select active range..." />
                    </SelectTrigger>
                    <SelectContent>
                      {billsLoading ? (
                        <div className="p-2 text-center text-xs"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                      ) : bills && bills.length > 0 ? (
                        bills.map((bill: any) => (
                          <SelectItem key={bill.id} value={bill.id}>
                            {formatDateRange(bill.startDate, bill.endDate)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-xs text-muted-foreground">No records found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full gap-2 shadow-sm" 
                  disabled={!selectedBill || isCalculating || !residents || residents.length === 0}
                  onClick={handleCalculate}
                >
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  Generate Split
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!allocationResults ? (
              <Card className="h-full min-h-[400px] border-dashed flex flex-col items-center justify-center text-center p-8 text-muted-foreground bg-slate-50/50">
                <Calculator className="h-16 w-16 mb-4 opacity-10" />
                <h3 className="text-xl font-semibold mb-2">No Generation Active</h3>
              </Card>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-700">
                <Card className="shadow-xl border-none">
                  <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" /> Distribution Results
                        </CardTitle>
                        <CardDescription className="text-primary-foreground/70 flex items-center gap-1">
                          <CalendarRange className="h-3.5 w-3.5" /> {formatDateRange(selectedBill!.startDate, selectedBill!.endDate)}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-lg px-4 py-1">
                        {allocationResults.totalAllocated.toFixed(3)} OMR
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="rounded-md border overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Resident</TableHead>
                            <TableHead>Calculated Share</TableHead>
                            <TableHead className="hidden md:table-cell">Breakdown</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocationResults.allocations.map((alloc, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{alloc.residentName}</TableCell>
                              <TableCell className="font-bold text-primary whitespace-nowrap">
                                {alloc.amount.toFixed(3)} OMR
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                                {alloc.explanation}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
