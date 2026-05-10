
"use client"

import React, { useMemo, useEffect } from 'react';
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
  FileText,
  Cake,
  Wrench,
  BarChart,
  Calculator,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useMemoFirebase, useUser, useAuth, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, orderBy, limit } from 'firebase/firestore';
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

  // Fetch Latest Released Bill for the Snapshot
  const latestBillQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('status', '==', 'Released'),
      orderBy('monthYear', 'desc'),
      limit(1)
    );
  }, [db]);

  const { data: bills, loading: billsLoading } = useCollection(latestBillQuery);
  const activeBill = bills && bills.length > 0 ? bills[0] : null;

  // Fetch all residents for share calculation
  const residentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db]);

  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

  const myShare = useMemo(() => {
    if (!activeBill || !residents || residents.length === 0) return null;

    const numResidents = residents.length;
    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscTotal = activeBill.miscellaneous || 0;
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = activeBill.wifi / numResidents;
    const waterSharePerDay = totalManDays > 0 ? (activeBill.water || 0) / totalManDays : 0;
    const electricitySharePerDay = totalManDays > 0 ? (activeBill.electricity || 0) / totalManDays : 0;
    const miscUsagePerDay = totalMiscManDays > 0 ? miscTotal / totalMiscManDays : 0;

    // For SuperAdmin preview, use the first resident if admin is not a resident
    const targetUser = residents.find(r => r.id === user?.uid) || residents[0];
    if (!targetUser) return null;

    const resDays = targetUser.billingDays ?? 30;
    const isMisc = targetUser.isMiscApplicable !== false;
    
    const wifi = wifiSharePerPerson;
    const water = waterSharePerDay * resDays;
    const electricity = electricitySharePerDay * resDays;
    const misc = isMisc ? (miscUsagePerDay * resDays) : 0;
    const rent = targetUser.monthlyRent || 0;
    
    return {
      total: rent + wifi + water + electricity + misc,
      isPaid: activeBill.paidResidents?.includes(targetUser.id),
      targetName: `${targetUser.firstName} ${targetUser.lastName}`,
      isMe: targetUser.id === user?.uid
    };
  }, [activeBill, residents, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Portal Data...</p>
      </div>
    );
  }

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
                {isSuperAdmin ? <><ShieldCheck className="h-3.5 w-3.5 text-primary" /> SuperAdmin</> : <><UserIcon className="h-3.5 w-3.5" /> Resident</>}
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
          
          {/* Quick Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Billing Snapshot */}
            <Card className="shadow-lg border-t-4 border-primary relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> 
                  {isSuperAdmin && !myShare?.isMe ? "Preview Share" : "My Billing Snapshot"}
                </CardTitle>
                <CardDescription>
                  {activeBill ? 
                    new Date(activeBill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
                    "Latest released period"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billsLoading || residentsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary/30" /></div>
                ) : myShare ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-3xl font-black text-primary">{myShare.total.toFixed(3)} OMR</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                          {myShare.isMe ? "Your estimated share" : `Previewing share for ${myShare.targetName}`}
                        </p>
                      </div>
                      <div className="text-right">
                        {myShare.isPaid ? (
                          <Badge className="bg-accent text-accent-foreground gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">No active statements found.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Household Snapshot */}
            <Card className="shadow-lg border-t-4 border-accent relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-accent" /> Household Snapshot
                </CardTitle>
                <CardDescription>Aggregate consumption totals</CardDescription>
              </CardHeader>
              <CardContent>
                {billsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-accent/30" /></div>
                ) : activeBill ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Household</p>
                      <p className="text-2xl font-black text-slate-800">{activeBill.total.toFixed(3)} OMR</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                      <Badge className="bg-accent/10 text-accent border-accent/20">Active Cycle</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">No consumption data released.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><FileText className="h-5 w-5" /> My Bills</CardTitle></CardHeader>
                  <CardContent><Button variant="outline" className="w-full">View Bills <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
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
