
"use client"

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RepairsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="p-4 bg-white rounded-xl shadow-lg border-t-4 border-primary">
          <h2 className="text-2xl font-bold text-primary mb-2">Module Removed</h2>
          <p className="text-muted-foreground mb-6">
            The Maintenance & Repairs module has been decommissioned as requested.
          </p>
          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full gap-2">
                <Home className="h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
