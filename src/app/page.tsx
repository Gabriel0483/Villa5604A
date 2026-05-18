
"use client"

import React, { useMemo, useEffect, useState } from 'react';
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
  UserCheck,
  History,
  TrendingUp,
  CreditCard,
  Users as UsersIcon,
  Info,
  PawPrint
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useMemoFirebase, useUser, useAuth, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      setIsRedirecting(true);
      router.replace('/login');
    }
  }, [user, userLoading, router]);

  if (userLoading || isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-800 animate-pulse uppercase tracking-widest">Initializing Portal...</p>
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

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, user]);

  const { data: residents } = useCollection(residentsQuery);

  const latestBillQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'utility_bills'), where('status', '==', 'Released'), orderBy('startDate', 'desc'), limit(1));
  }, [db, user]);

  const { data: bills } = useCollection(latestBillQuery);
  const latestBill = bills && bills.length > 0 ? bills[0] : null;

  const metrics = useMemo(() => {
    if (!residents) return null;

    const roomUnits = ['101', '102', '103', '201', '202', '203', '204', '301'];
    const occupiedRooms = new Set();
    residents.forEach((r: any) => {
      if (r.roomUnit) {
        const unit = r.roomUnit.toLowerCase();
        if (unit.includes('101')) occupiedRooms.add('101');
        else if (unit.includes('102')) occupiedRooms.add('102');
        else if (unit.includes('103')) occupiedRooms.add('103');
        else if (unit.includes('201')) occupiedRooms.add('201');
        else if (unit.includes('202')) occupiedRooms.add('202');
        else if (unit.includes('203')) occupiedRooms.add('203');
        else if (unit.includes('204')) occupiedRooms.add('204');
        else if (unit.includes('301')) occupiedRooms.add('301');
      }
    });
    const occupancyRate = (occupiedRooms.size / 8) * 100;

    let paidCount = 0;
    let totalCollected = 0;
    let totalExpected = 0;
    let rentExpected = 0;
    let utilsExpected = 0;
    let rentCollected = 0;
    let utilsCollected = 0;

    if (latestBill && latestBill.itemizedStatements) {
      const paidIds = latestBill.paidResidents || [];
      latestBill.itemizedStatements.forEach((s: any) => {
        const itemRent = s.baseRent || 0;
        const itemUtils = (s.wifi || 0) + (s.water || 0) + (s.electricity || 0) + (s.misc || 0);
        
        totalExpected += s.total;
        rentExpected += itemRent;
        utilsExpected += itemUtils;

        if (paidIds.includes(s.residentId)) {
          paidCount++;
          totalCollected += s.total;
          rentCollected += itemRent;
          utilsCollected += itemUtils;
        }
      });
    }

    const progressPercent = latestBill?.itemizedStatements?.length 
      ? (paidCount / latestBill.itemizedStatements.length) * 100 
      : 0;

    return {
      tenantCount: residents.length,
      occupancyRate,
      paidCount,
      totalTenantsInBill: latestBill?.itemizedStatements?.length || 0,
      totalCollected,
      totalExpected,
      rentExpected,
      utilsExpected,
      rentCollected,
      utilsCollected,
      remainingBalance: Math.max(0, totalExpected - totalCollected),
      progressPercent,
      cycleName: latestBill?.monthYear || 'No active cycle'
    };
  }, [residents, latestBill]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {}
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-800 animate-pulse uppercase tracking-widest">Syncing Portal Data...</p>
      </div>
    );
  }

  const adminModules = [
    { title: 'Tenant Registry', icon: <UserCheck className="h-6 w-6" />, path: '/tenants', label: 'Manage Residents', color: 'blue' },
    { title: 'Latest Bills', icon: <Zap className="h-6 w-6" />, path: '/utilities', label: 'View Latest Records', color: 'amber' },
    { title: 'Billing Archive', icon: <History className="h-6 w-6" />, path: '/billing-history', label: 'Past Utility Logs', color: 'indigo' },
    { title: 'Pet Registry', icon: <PawPrint className="h-6 w-6" />, path: '/pets', label: 'Resident Animals', color: 'emerald' },
    { title: 'Birthdays', icon: <Cake className="h-6 w-6" />, path: '/birthdays', label: 'Greet Residents', color: 'rose' },
    { title: 'Manage Issues', icon: <Wrench className="h-6 w-6" />, path: '/repairs', label: 'View Maintenance', color: 'orange' },
  ];

  const residentModules = [
    { title: 'My Bills', icon: <FileText className="h-6 w-6" />, path: '/my-bills', label: 'View Current Statement', color: 'indigo' },
    { title: 'Latest Bills', icon: <Zap className="h-6 w-6" />, path: '/utilities', label: 'View Household Totals', color: 'amber' },
    { title: 'Pet Registry', icon: <PawPrint className="h-6 w-6" />, path: '/pets', label: 'View Villa Pets', color: 'emerald' },
    { title: 'Report Issue', icon: <Wrench className="h-6 w-6" />, path: '/repairs', label: 'Maintenance Request', color: 'orange' },
    { title: 'My Profile', icon: <UserIcon className="h-6 w-6" />, path: '/profile', label: 'Personal Details', color: 'blue' },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white';
      case 'amber': return 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white';
      case 'rose': return 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white';
      case 'orange': return 'bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-600 group-hover:text-white';
      case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white';
      case 'emerald': return 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white';
      default: return 'bg-primary/10 text-primary border-primary/10';
    }
  };

  const getBorderClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'hover:border-blue-400 border-t-blue-500';
      case 'amber': return 'hover:border-amber-400 border-t-amber-500';
      case 'rose': return 'hover:border-rose-400 border-t-rose-500';
      case 'orange': return 'hover:border-orange-400 border-t-orange-500';
      case 'indigo': return 'hover:border-indigo-400 border-t-indigo-500';
      case 'emerald': return 'hover:border-emerald-400 border-t-emerald-500';
      default: return 'hover:border-primary border-t-primary';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-primary/10 rounded-xl shadow-inner">
                <Building2 className="h-5 w-5 md:h-7 md:w-7 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg md:text-2xl text-primary tracking-tighter leading-none">Villa 5604</span>
                <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 md:mt-1">Portal Management</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex flex-col items-end mr-1 text-right">
              <span className="text-xs md:text-sm font-black text-slate-900">
                {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (user?.email?.split('@')[0])}
              </span>
              <span className="text-[9px] md:text-[10px] text-slate-600 font-bold flex items-center gap-1 justify-end uppercase tracking-tighter">
                {isSuperAdmin ? <><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin</> : <><UserIcon className="h-3.5 w-3.5" /> Resident</>}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-full ring-primary/10 hover:ring-4 transition-all bg-slate-50">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 shadow-2xl border-none">
                <DropdownMenuLabel className="font-black text-slate-900 px-4 py-3">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer gap-3 p-3 font-bold text-slate-700 hover:text-primary rounded-lg">
                    <Settings className="h-5 w-5" /> Profile Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive gap-3 p-3 font-bold rounded-lg" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <Badge variant="outline" className="px-4 py-2 border-primary/20 text-primary font-black uppercase text-xs tracking-tighter bg-primary/5">
                Current Role: {isSuperAdmin ? 'Administrator' : 'Resident'}
              </Badge>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mt-4">
                Welcome back, <span className="text-primary">{profile?.firstName || 'Resident'}</span>
              </h2>
              <p className="text-sm md:text-lg text-slate-600 font-bold mt-2 max-w-2xl">
                Track your itemized utility statements and report maintenance issues through your resident portal.
              </p>
            </div>
          </div>

          {metrics && (
            <>
              <Card className="bg-slate-900 border-none overflow-hidden rounded-2xl md:rounded-[2rem] shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <CardContent className="p-6 md:p-10 space-y-8 relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        {isSuperAdmin ? 'Payment Collection Status' : 'Community Payment Progress'}
                      </p>
                      <h3 className="text-xl md:text-2xl font-black text-white">{metrics.cycleName} Cycle</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-8 text-right flex-wrap md:flex-nowrap">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest flex items-center justify-end gap-1">
                          Collected
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-slate-900 font-bold border-slate-200">
                                <p>Rent: {metrics.rentCollected.toFixed(3)} OMR</p>
                                <p>Utilities: {metrics.utilsCollected.toFixed(3)} OMR</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </p>
                        <p className="text-lg font-black text-emerald-500">{metrics.totalCollected.toFixed(3)} OMR</p>
                      </div>

                      <div className="h-10 w-px bg-slate-800 hidden md:block" />

                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-rose-500/80 uppercase tracking-widest">Remaining Balance</p>
                        <p className="text-lg font-black text-rose-500">{metrics.remainingBalance.toFixed(3)} OMR</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {metrics.paidCount} / {metrics.totalTenantsInBill} Residents Paid
                        </span>
                        <p className="text-[10px] text-slate-500 font-bold italic">Combined Rent + Utilities for current cycle</p>
                      </div>
                      <span className="text-2xl font-black text-primary italic">{metrics.progressPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={metrics.progressPercent} className="h-3 bg-slate-800" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4 w-full lg:w-max">
                <Card className="bg-white border-none shadow-md p-4 min-w-[140px] md:min-w-[180px]">
                  <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <UsersIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Residents</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{metrics.tenantCount}</div>
                  <div className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">Active Community</div>
                </Card>
                <Card className="bg-white border-none shadow-md p-4 min-w-[140px] md:min-w-[180px]">
                  <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Occupancy</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{metrics.occupancyRate.toFixed(0)}%</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">8 Room Cap</div>
                </Card>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
            {(isSuperAdmin ? adminModules : residentModules).map(item => (
              <Card 
                key={item.path} 
                className={cn(
                  "group hover:shadow-2xl transition-all duration-300 border-t-8 cursor-pointer overflow-hidden transform hover:-translate-y-1 active:scale-95",
                  getBorderClasses(item.color)
                )} 
                onClick={() => router.push(item.path)}
              >
                <CardHeader className="pb-4">
                  <div className={cn(
                    "h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center mb-2 transition-colors duration-300 border",
                    getColorClasses(item.color)
                  )}>
                    {item.icon}
                  </div>
                  <CardTitle className="text-lg md:text-xl font-black text-slate-900 group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-700 p-0 hover:bg-transparent hover:text-primary">
                    {item.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-6 md:py-8 text-center border-t bg-white">
        <div className="container mx-auto px-4 flex flex-col items-center gap-2">
          <span className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-[0.2em] font-black">
            Villa 5604 Portal © 2026
          </span>
          <div className="h-1 w-12 bg-primary/20 rounded-full" />
        </div>
      </footer>
    </div>
  )
}
