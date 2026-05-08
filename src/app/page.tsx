
"use client"

import React from 'react';
import Link from 'next/link';
import { User as UserIcon, ArrowRight, Building2, ShieldCheck, LayoutDashboard, Users, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-primary">Villa 5604</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Villa 5604 Admin Portal
            </h1>
            <p className="text-muted-foreground">
              Manage the property portfolio and resident records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutDashboard className="h-5 w-5 text-accent" /> Property Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  View property documents and common area maintenance schedules.
                </p>
                <Button className="w-full bg-accent hover:bg-accent/90">
                  View Details
                </Button>
              </CardContent>
            </Card>
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
