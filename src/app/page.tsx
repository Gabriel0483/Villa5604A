
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  ArrowRight, 
  Users, 
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
  History,
  Calculator,
  BarChart3,
  CheckCircle2,
  Clock
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

export default function Home() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Snapshot logic: Get the latest bill specifically marked as isSnapshot.
  // We removed the restrictive 'monthYear >= today' filter to ensure
  // that snapshots for the previous month (standard billing) are visible.
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (userLoading || (user && profileLoading) || !mounted || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Initializing Portal...</p>
      </div>
    );
  }

  const isCurrentPaid = latestBill?.paidResidents?.includes(user.uid);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-xl text-primary tracking-tight">Villa 5604</span>
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
              Villa 5604 Portal
            </h1>
            <p className="text-muted-foreground">Welcome to the central management hub.</p>
          </div>

          {!isSuperAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-lg border-t-4 border-primary">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" /> Current Bill Snapshot
                      </CardTitle>
                      <CardDescription>Latest released household utility consumption.</CardDescription>
                    </div>
                    {latestBill && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {new Date(latestBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Badge>
                        {isCurrentPaid ? (
                          <Badge className="bg-accent text-accent-foreground text-[10px]">PAID</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">PENDING</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {billsLoading ? (
                    <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                  ) : latestBill ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase mb-1">
                            <Wifi className="h-3 w-3" /> Wifi
                          </div>
                          <p className="text-lg font-bold">{latestBill.wifi.toFixed(3)} OMR</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase mb-1">
                            <Droplets className="h-3 w-3" /> Water
                          </div>
                          <p className="text-lg font-bold">{latestBill.water.toFixed(3)} OMR</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase mb-1">
                            <Lightbulb className="h-3 w-3" /> Electricity
                          </div>
                          <p className="text-lg font-bold">{latestBill.electricity.toFixed(3)} OMR</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase mb-1">
                            <Plus className="h-3 w-3" /> Misc
                          </div>
                          <p className="text-lg font-bold">{(latestBill.miscellaneous || 0).toFixed(3)} OMR</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Household Total</span>
                          <p className="text-3xl font-black text-primary">{latestBill.total.toFixed(3)} OMR</p>
                        </div>
                        <Button className="gap-2" onClick={() => router.push('/bills')}>
                          <History className="h-4 w-4" /> View My Bills
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground italic">
                      No billing records have been published yet for this month.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg border-t-4 border-accent">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-accent" /> Lease View
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Assigned Room</span>
                      <span className="font-bold">{profile?.roomUnit || 'Pending'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Rent</span>
                      <span className="font-bold text-primary">{profile?.monthlyRent ? `${profile.monthlyRent.toLocaleString()} OMR` : 'Not Set'}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full text-xs h-8" onClick={() => router.push('/profile')}>
                      Full Lease Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Manage resident profiles and oversaw occupancy details.
                    </p>
                    <Button variant="outline" className="w-full">Registry <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/utilities')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-primary" /> Current Bill
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Record the active monthly bill for the dashboard snapshot.
                    </p>
                    <Button variant="outline" className="w-full">Manage Cycle <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/shared-expenses')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-primary" /> Shared Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Record past and current expenses for consumption trends.
                    </p>
                    <Button variant="outline" className="w-full">Expense Ledger <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/statements')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-primary" /> Billing & Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Generate statements and track resident payment statuses.
                    </p>
                    <Button variant="outline" className="w-full">Statements <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/pro-rata')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="h-5 w-5 text-primary" /> Pro-Rata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Calculate fair splits of household bills among residents.
                    </p>
                    <Button variant="outline" className="w-full">Split Logic <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/birthdays')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Cake className="h-5 w-5 text-primary" /> Birthdays
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Celebrate resident birthdays with AI-powered cards.
                    </p>
                    <Button variant="outline" className="w-full">View Dates <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer border-destructive/10" onClick={() => router.push('/repairs')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wrench className="h-5 w-5 text-destructive" /> Manage Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View and resolve resident maintenance requests.
                    </p>
                    <Button variant="outline" className="w-full">View Issues <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View historical billing statements and payment status.
                    </p>
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Need a repair? Report maintenance issues here.
                    </p>
                    <Button variant="outline" className="w-full">Report Problem <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all border-primary/10 group cursor-pointer" onClick={() => router.push('/profile')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserIcon className="h-5 w-5 text-primary" /> My Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Update your personal details and contact info.
                    </p>
                    <Button variant="outline" className="w-full">Manage Profile <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
          <span className="font-medium">Villa 5604 Admin Portal 2026</span>
        </div>
      </footer>
    </div>
  )
}
