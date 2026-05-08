
"use client"

import Link from 'next/link';
import { User, ArrowRight, Building2, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary mb-4">
          <Zap className="h-3 w-3 mr-1" /> New Feature: Tenant Management
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">
          Property Management <span className="text-accent">Simplified</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Efficiently manage your property portfolio, track tenants, and monitor lease agreements all in one modern platform.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 text-left">
          <Card className="hover:shadow-lg transition-shadow border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" /> Manage Tenants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Track names, lease dates, and rent payments for all your properties in real-time.
              </p>
              <Link href="/tenants">
                <Button className="w-full group">
                  Go to Tenants <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="opacity-60 cursor-not-allowed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" /> Security Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upcoming feature to track maintenance requests and building security access logs.
              </p>
              <Button disabled variant="outline" className="w-full mt-4">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="mt-20 text-sm text-muted-foreground flex items-center gap-2">
        <Building2 className="h-4 w-4" /> LeaseLink Property Management System v1.0
      </footer>
    </div>
  )
}
