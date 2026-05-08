
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  ArrowRight, 
  Users, 
  Receipt, 
  LayoutDashboard, 
  TrendingUp,
  DollarSign,
  Loader2,
  LogOut,
  LogIn,
  User as UserIcon,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
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
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stabilize the user profile query
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile } = useDoc(userProfileRef);

  // Use useMemoFirebase to stabilize the query reference and ensure data persistence in UI
  const tenantsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'tenants'));
  }, [db]);

  const { data: tenants, loading: tenantsLoading } = useCollection(tenantsQuery);

  const isSuperAdmin = useMemo(() => {
    if (user?.email === 'rielmagpantay@gmail.com') return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  // Calculate statistics from persistent Firestore data
  const stats = useMemo(() => {
    if (!tenants) return { count: 0, totalRent: 0 };
    return {
      count: tenants.length,
      totalRent: tenants.reduce((acc, tenant: any) => acc + (Number(tenant.rentAmount) || 0), 0)
    };
  }, [tenants]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.refresh();
    } catch (error) {
      // Handled silently
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
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
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end mr-1">
                  <span className="text-sm font-medium text-slate-900">{profile?.name || user.email}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {isSuperAdmin && <ShieldCheck className="h-3 w-3 text-primary" />}
                    {isSuperAdmin ? 'SuperAdmin' : 'Resident'}
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
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Villa 5604 Admin Portal
            </h1>
            <p className="text-muted-foreground">
              Real-time property and resident management powered by Firestore.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                <Users className="h-16 w-16" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/70">Total Tenants</CardDescription>
                <CardTitle className="text-3xl font-bold">
                  {tenantsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.count}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-primary-foreground/60">Active residents in portfolio</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-accent text-accent-foreground overflow-hidden relative">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                <TrendingUp className="h-16 w-16" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-accent-foreground/70">Monthly Revenue</CardDescription>
                <CardTitle className="text-3xl font-bold flex items-center">
                  <DollarSign className="h-6 w-6 mr-1" />
                  {tenantsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalRent.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-accent-foreground/60">Total combined rent</p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-all border-primary/10 group cursor-default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" /> Tenant Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track active residents, update profile details, and manage monthly rent amounts.
                </p>
                <Link href="/tenants">
                  <Button className="w-full group-hover:bg-primary/90 transition-colors">
                    Manage Tenants <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all border-primary/10 group cursor-default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserIcon className="h-5 w-5 text-primary" /> Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Update your contact information, display name, and manage your account preferences.
                </p>
                <Link href="/profile">
                  <Button variant="outline" className="w-full">
                    View Profile <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all border-primary/10 group cursor-default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-accent">
                  <LayoutDashboard className="h-5 w-5" /> Property Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  View property documents, common area schedules, and repair statuses.
                </p>
                <Button variant="secondary" className="w-full bg-accent/10 text-accent hover:bg-accent/20">
                  View Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground border-t bg-white">
        <div className="flex justify-center items-center gap-2">
          <Building2 className="h-4 w-4 text-primary/50" /> 
          <span className="font-medium">Villa 5604</span> Admin Portal &copy; {mounted ? new Date().getFullYear() : ''}
        </div>
      </footer>
    </div>
  )
}
