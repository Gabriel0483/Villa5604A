
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  ArrowRight, 
  Loader2,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Settings,
  Zap,
  Wifi,
  Droplets,
  Lightbulb,
  Plus,
  Receipt,
  FileText,
  Cake,
  Wrench,
  Users,
  BarChart,
  Calculator,
  UserCheck,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import { collection, query, doc, where, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login');
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Portal...</p>
      </div>
    );
  }

  if (!user) return null;

  return <DashboardContent />;
}

function DashboardContent() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();

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

  const snapshotQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('isSnapshot', '==', true),
      orderBy('monthYear', 'desc'), 
      limit(1)
    );
  }, [db, user]);

  const { data: snapshotBills, loading: snapshotLoading } = useCollection(snapshotQuery);

  const latestReleasedQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('status', '==', 'Released'),
      orderBy('monthYear', 'desc'), 
      limit(1)
    );
  }, [db, user]);

  const { data: latestReleasedBills, loading: latestLoading } = useCollection(latestReleasedQuery);

  const latestBill = useMemo(() => {
    if (snapshotBills && snapshotBills.length > 0) return snapshotBills[0] as any;
    if (latestReleasedBills && latestReleasedBills.length > 0) return latestReleasedBills[0] as any;
    return null;
  }, [snapshotBills, latestReleasedBills]);

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, user]);

  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

  const myIndividualShares = useMemo(() => {
    if (!latestBill || !residents || residents.length === 0 || !user) return null;

    const numResidents = residents.length;
    const wifiTotal = latestBill.wifi || 0;
    const miscTotal = latestBill.miscellaneous || 0;
    
    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = wifiTotal / numResidents;
    const waterSharePerDay = totalManDays > 0 ? (latestBill.water || 0) / totalManDays : 0;
    const electricitySharePerDay = totalManDays > 0 ? (latestBill.electricity || 0) / totalManDays : 0;
    const miscUsagePerDay = totalMiscManDays > 0 ? miscTotal / totalMiscManDays : 0;

    const myProfile = residents.find(r => r.id === user.uid);
    const targetProfile = myProfile || residents[0];
    
    if (!targetProfile) return null;

    const resDays = targetProfile.billingDays ?? 30;
    const isMisc = targetProfile.isMiscApplicable !== false;

    return {
      wifi: wifiSharePerPerson,
      water: waterSharePerDay * resDays,
      electricity: electricitySharePerDay * resDays,
      misc: isMisc ? (miscUsagePerDay * resDays) : 0,
      total: wifiSharePerPerson + (waterSharePerDay * resDays) + (electricitySharePerDay * resDays) + (isMisc ? (miscUsagePerDay * resDays) : 0),
      isResident: !!myProfile,
      targetName: targetProfile.firstName
    };
  }, [latestBill, residents, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${new Date(start).toLocaleDateString('en-US', options)} - ${new Date(end).toLocaleDateString('en-US', options)}`;
  };

  if (profileLoading || residentsLoading || snapshotLoading || latestLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Portal Data...</p>
      </div>
    );
  }

  const collectionProgress = latestBill && residents ? {
    paidCount: latestBill.paidResidents?.length || 0,
    totalCount: residents.length,
    percentage: residents.length > 0 ? ((latestBill.paidResidents?.length || 0) / residents.length) * 100 : 0
  } : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-xl text-primary tracking-tight">Villa 5604 Portal</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-1 text-right">
              <span className="text-sm font-medium text-slate-900">
                {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (user?.email?.split('@')[0])}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                {isSuperAdmin ? <><ShieldCheck className="h-3 w-3 text-primary" /> SuperAdmin</> : <><UserIcon className="h-3 w-3" /> Resident</>}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ring-primary/10 hover:ring-2 transition-all">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile"><DropdownMenuItem className="cursor-pointer gap-2"><Settings className="h-4 w-4" /> Profile</DropdownMenuItem></Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Portal Snapshot</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" /> {myIndividualShares?.isResident ? "My Billing Snapshot" : "Resident Share Preview"}
                    </CardTitle>
                    <CardDescription>
                      {myIndividualShares?.isResident ? "Your personal share for the active cycle." : `Preview calculation for ${myIndividualShares?.targetName || 'Registry'}.`}
                    </CardDescription>
                  </div>
                  {latestBill && (
                    <Badge variant="secondary" className="text-[10px]">
                      {latestBill.monthYear}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {latestBill && myIndividualShares ? (
                  <div className="space-y-6">
                    {latestBill.startDate && latestBill.endDate && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary">
                          {formatDateRange(latestBill.startDate, latestBill.endDate)}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Wifi', val: myIndividualShares.wifi, icon: <Wifi className="h-3 w-3" /> },
                        { label: 'Water', val: myIndividualShares.water, icon: <Droplets className="h-3 w-3" /> },
                        { label: 'Elec', val: myIndividualShares.electricity, icon: <Lightbulb className="h-3 w-3" /> },
                        { label: 'Misc', val: myIndividualShares.misc, icon: <Plus className="h-3 w-3" /> },
                      ].map(item => (
                        <div key={item.label} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                            {item.icon} {item.label}
                          </div>
                          <p className="text-lg font-bold">{item.val.toFixed(3)} OMR</p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Individual Total Share</span>
                      <p className="text-4xl font-black text-primary">{myIndividualShares.total.toFixed(3)} OMR</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground italic bg-slate-50/50 rounded-lg border border-dashed">
                    No active published snapshot found.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-t-4 border-slate-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500" /> Household Snapshot
                </CardTitle>
                <CardDescription>Total household charges for the villa.</CardDescription>
              </CardHeader>
              <CardContent>
                {latestBill ? (
                  <div className="space-y-6">
                    {latestBill.startDate && latestBill.endDate && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-600">
                          {formatDateRange(latestBill.startDate, latestBill.endDate)}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Wifi', val: latestBill.wifi, icon: <Wifi className="h-3 w-3" /> },
                        { label: 'Water', val: latestBill.water, icon: <Droplets className="h-3 w-3" /> },
                        { label: 'Elec', val: latestBill.electricity, icon: <Lightbulb className="h-3 w-3" /> },
                        { label: 'Misc', val: latestBill.miscellaneous, icon: <Plus className="h-3 w-3" /> },
                      ].map(item => (
                        <div key={item.label} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                            {item.icon} {item.label}
                          </div>
                          <p className="text-lg font-bold">{(item.val || 0).toFixed(3)} OMR</p>
                        </div>
                      ))}
                    </div>
                    {collectionProgress && (
                      <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold flex items-center gap-1.5 text-slate-600"><Users className="h-3 w-3" /> Household Progress</span>
                          <span className="font-bold text-primary">{collectionProgress.paidCount} / {collectionProgress.totalCount} Paid</span>
                        </div>
                        <Progress value={collectionProgress.percentage} className="h-2 bg-slate-200" />
                      </div>
                    )}
                    <div className="pt-4 border-t flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Household Total</span>
                      <p className="text-4xl font-black text-slate-900">{(latestBill.total || 0).toFixed(3)} OMR</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground italic bg-slate-50/50 rounded-lg border border-dashed">
                    No active household snapshot published.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isSuperAdmin ? (
              <>
                {[
                  { title: 'Tenant Registry', icon: <UserCheck className="h-5 w-5" />, path: '/tenants', label: 'Manage Residents' },
                  { title: 'Active Cycle', icon: <Zap className="h-5 w-5" />, path: '/utilities', label: 'Utility Management' },
                  { title: 'Shared Expenses', icon: <BarChart className="h-5 w-5" />, path: '/shared-expenses', label: 'Expense Ledger' },
                  { title: 'Billing Statements', icon: <FileText className="h-5 w-5" />, path: '/statements', label: 'Statements & Payments' },
                  { title: 'Pro-Rata', icon: <Calculator className="h-5 w-5" />, path: '/pro-rata', label: 'Split Calculation' },
                  { title: 'Birthdays', icon: <Cake className="h-5 w-5" />, path: '/birthdays', label: 'Greet Residents' },
                ].map(item => (
                  <Card key={item.path} className="hover:shadow-md transition-all border-primary/10 cursor-pointer" onClick={() => router.push(item.path)}>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary">{item.icon} {item.title}</CardTitle></CardHeader>
                    <CardContent><Button variant="outline" className="w-full">{item.label} <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
                  </Card>
                ))}
                <Card className="hover:shadow-md transition-all border-destructive/10 cursor-pointer" onClick={() => router.push('/repairs')}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-destructive"><Wrench className="h-5 w-5" /> Manage Issues</CardTitle></CardHeader>
                  <CardContent><Button variant="outline" className="w-full">View Maintenance <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="hover:shadow-md transition-all border-primary/10 cursor-pointer" onClick={() => router.push('/bills')}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><Receipt className="h-5 w-5" /> My Bills</CardTitle></CardHeader>
                  <CardContent><Button variant="outline" className="w-full">History <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all border-primary/10 cursor-pointer" onClick={() => router.push('/repairs')}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><Wrench className="h-5 w-5" /> Report Issue</CardTitle></CardHeader>
                  <CardContent><Button variant="outline" className="w-full">Maintenance Request <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all border-primary/10 cursor-pointer" onClick={() => router.push('/profile')}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><UserIcon className="h-5 w-5" /> My Profile</CardTitle></CardHeader>
                  <CardContent><Button variant="outline" className="w-full">Personal Details <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-6 text-center text-[10px] text-muted-foreground border-t bg-white uppercase tracking-widest font-bold">
        Villa 5604 Portal © 2026
      </footer>
    </div>
  )
}
