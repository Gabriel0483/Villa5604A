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
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      // Log errors silently
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
              <span className="font-bold text-xl text-primary tracking-tight">Villa 5604</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {isSuperAdmin ? (
              <>
                {[
                  { title: 'Tenant Registry', icon: <UserCheck className="h-5 w-5" />, path: '/tenants', label: 'Manage Residents' },
                  { title: 'Latest Bills', icon: <Zap className="h-5 w-5" />, path: '/utilities', label: 'View Latest Records' },
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
                  <CardContent><Button variant="outline" className="w-full">View Details <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all border-primary/10 cursor-pointer" onClick={() => router.push('/utilities')}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><Zap className="h-5 w-5" /> Latest Bills</CardTitle></CardHeader>
                  <CardContent><Button variant="outline" className="w-full">View Details <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent>
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
        Villa 5604 © 2026
      </footer>
    </div>
  )
}
