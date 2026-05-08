
"use client"

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { User as UserIcon, ArrowRight, Building2, ShieldCheck, Zap, LogOut, LayoutDashboard, Users, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

export default function Home() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const userDocRef = React.useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const isAdmin = profile.role === 'SuperAdmin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-primary">Villa 5604</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold">{profile.name}</span>
              <span className="text-xs text-muted-foreground">{profile.role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Welcome back, {profile.name.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Here's an overview of the property portfolio management." 
                : "Manage your residence details and rent payments."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Common Feature: Profile */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserIcon className="h-5 w-5 text-accent" /> My Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">User Code</p>
                  <p className="font-mono font-medium">{profile.userCode}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Account Status</p>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Admin Features */}
            {isAdmin && (
              <>
                <Card className="hover:shadow-md transition-shadow border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-primary" /> Tenant Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Track all active residents, manage lease details, and update rent records.
                    </p>
                    <Link href="/tenants">
                      <Button className="w-full group">
                        Manage Tenants <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Receipt className="h-5 w-5 text-primary" /> Financial Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Coming Soon: View total revenue, pending rent, and financial reports.
                    </p>
                    <Button variant="outline" className="w-full opacity-50" disabled>
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Resident Features */}
            {!isAdmin && (
              <>
                <Card className="hover:shadow-md transition-shadow border-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LayoutDashboard className="h-5 w-5 text-accent" /> My Residence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      View your rent history, property documents, and maintenance requests.
                    </p>
                    <Button className="w-full bg-accent hover:bg-accent/90">
                      View Details
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-accent" /> Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Need help? Submit a request to the building management team.
                    </p>
                    <Button variant="outline" className="w-full">
                      Contact Admin
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center text-sm text-muted-foreground border-t bg-white">
        <div className="flex justify-center items-center gap-2">
          <Building2 className="h-4 w-4" /> Villa 5604 Admin Portal v2.0
        </div>
      </footer>
    </div>
  )
}
