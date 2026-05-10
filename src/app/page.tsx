
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
  UserCheck,
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
  Calculator
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
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict Redirection to /login as landing page
  useEffect(() => {
    if (mounted && !userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router, mounted]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const email = user.email?.toLowerCase() || '';
    const adminEmails = [
      'rielmagpantay@gmail.com', 
      'rielmagpantay@gmail.com@villa5604.app',
      'room101@villa5604.app',
      'admin001@villa5604.app'
    ];
    if (adminEmails.includes(email)) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  // Query for the active household snapshot
  const latestBillQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('isSnapshot', '==', true),
      orderBy('monthYear', 'desc'), 
      limit(1)
    );
  }, [db, user]);

  const { data: latestBills, loading: billsLoading } = useCollection(latestBillQuery);
  const latestBill = latestBills?.[0] as any;

  // Query all residents to calculate individual shares
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

    // Determine target profile: current user if they are a resident, else the first resident for preview
    const myProfile = residents.find(r => r.id === user.uid);
    const targetProfile = myProfile || residents[0];
    
    if (!targetProfile) return null;

    const resDays = targetProfile.billingDays ?? 30;
    const isMisc = targetProfile.isMiscApplicable !== false;

    const myWifi = wifiSharePerPerson;
    const myWater = waterSharePerDay * resDays;
    const myElec = electricitySharePerDay * resDays;
    const myMisc = isMisc ? (miscUsagePerDay * resDays) : 0;

    return {
      wifi: myWifi,
      water: myWater,
      electricity: myElec,
      misc: myMisc,
      total: myWifi + myWater + myElec + myMisc,
      days: resDays,
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

  if (!mounted || userLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Portal...</p>
      </div>
    );
  }

  if (user && (profileLoading || residentsLoading || billsLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="relative">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
           <Building2 className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Portal Data...</p>
      </div>
    );
  }

  if (!user) return null;

  const isCurrentPaid = latestBill?.paidResidents?.includes(user.uid);
  
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
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-1">
                <span className="text-sm font-medium text-slate-900">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (profile?.name || user.email?.split('@')[0])}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {isSuperAdmin ? (
                    <><ShieldCheck className="h-3.5 w-3.5 text-primary" /> SuperAdmin</>
                  ) : (
                    <><UserIcon className="h-3.5 w-3.5 text-slate-400" /> Resident</>
                  )}
                </span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full ring-primary/20 hover:ring-2 transition-all">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <Settings className="h-4 w-4" /> Profile Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive gap-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Portal Snapshot
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" /> {myIndividualShares?.isResident ? "My Billing Snapshot" : "Resident Share Preview"}
                    </CardTitle>
                    <CardDescription>
                      {myIndividualShares?.isResident 
                        ? "Your personal share for the active cycle." 
                        : `Showing preview share calculation for ${myIndividualShares?.targetName}.`}
                    </CardDescription>
                  </div>
                  {latestBill && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {new Date(latestBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </Badge>
                      {myIndividualShares?.isResident && (
                        isCurrentPaid ? (
                          <Badge className="bg-accent text-accent-foreground text-[10px]">PAID</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">PENDING</Badge>
                        )
                      )}
                      {!myIndividualShares?.isResident && isSuperAdmin && (
                        <Badge variant="outline" className="text-[10px]">ADMIN VIEW</Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {latestBill && myIndividualShares ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Wifi className="h-3 w-3" /> Wifi
                        </div>
                        <p className="text-lg font-bold">{myIndividualShares.wifi.toFixed(3)} OMR</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Droplets className="h-3 w-3" /> Water
                        </div>
                        <p className="text-lg font-bold">{myIndividualShares.water.toFixed(3)} OMR</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Lightbulb className="h-3 w-3" /> Elec
                        </div>
                        <p className="text-lg font-bold">{myIndividualShares.electricity.toFixed(3)} OMR</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Plus className="h-3 w-3" /> Misc
                        </div>
                        <p className="text-lg font-bold">{myIndividualShares.misc.toFixed(3)} OMR</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Calculated Individual Share</span>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-slate-500" /> Household Snapshot
                    </CardTitle>
                    <CardDescription>Total household charges for the villa.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {latestBill ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Wifi className="h-3 w-3" /> Total Wifi
                        </div>
                        <p className="text-lg font-bold">{(latestBill.wifi || 0).toFixed(3)} OMR</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Droplets className="h-3 w-3" /> Total Water
                        </div>
                        <p className="text-lg font-bold">{(latestBill.water || 0).toFixed(3)} OMR</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Lightbulb className="h-3 w-3" /> Total Elec
                        </div>
                        <p className="text-lg font-bold">{(latestBill.electricity || 0).toFixed(3)} OMR</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-1">
                          <Plus className="h-3 w-3" /> Total Misc
                        </div>
                        <p className="text-lg font-bold">{(latestBill.miscellaneous || 0).toFixed(3)} OMR</p>
                      </div>
                    </div>

                    {collectionProgress && (
                      <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold flex items-center gap-1.5 text-slate-600">
                            <Users className="h-3 w-3" /> Household Progress
                          </span>
                          <span className="font-bold text-primary">
                            {collectionProgress.paidCount} / {collectionProgress.totalCount} Paid
                          </span>
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
                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/tenants')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCheck className="h-5 w-5 text-primary" /> Tenant Registry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Manage Residents <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/utilities')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-primary" /> Active Cycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Utility Management <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/shared-expenses')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart className="h-5 w-5 text-primary" /> Shared Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Expense Ledger <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/statements')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-primary" /> Billing Statements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Statements & Payments <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/pro-rata')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="h-5 w-5 text-primary" /> Pro-Rata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Split Calculation <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/birthdays')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Cake className="h-5 w-5 text-primary" /> Birthdays
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Greet Residents <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer border-destructive/10" onClick={() => router.push('/repairs')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wrench className="h-5 w-5 text-destructive" /> Manage Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">View Maintenance <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/bills')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Receipt className="h-5 w-5 text-primary" /> My Bills
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">History <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/repairs')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wrench className="h-5 w-5 text-primary" /> Report Issue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Maintenance Request <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/profile')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserIcon className="h-5 w-5 text-primary" /> My Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">Personal Details <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground border-t bg-white">
        <div className="flex justify-center items-center gap-2">
          <Building2 className="h-4 w-4 text-primary/50" /> 
          <span className="font-medium">Villa 5604 Portal 2026</span>
        </div>
      </footer>
    </div>
  )
}
