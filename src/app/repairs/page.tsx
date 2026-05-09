import Link from 'next/link';
import { ArrowLeft, Wrench } from 'lucide-react';

export default function RepairsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Wrench className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Module Removed</h1>
          <p className="text-muted-foreground">
            The Repairs & Maintenance module is no longer available.
          </p>
        </div>
        <Link href="/" className="inline-flex items-center text-primary font-medium hover:underline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}