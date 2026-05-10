
"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Zap, 
  Wifi, 
  Droplets, 
  Lightbulb, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  Save, 
  Calendar,
  AlertCircle,
  History,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, orderBy, limit, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function CurrentUtilityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [formData, setFormData] = useState({
    monthYear: '',
    wifi: '',
    water: '',
    electricity: '',
    miscellaneous: ''
  });

  // Ref to track if we have successfully loaded data from the database
  const hasLoadedFromDb = useRef(false);

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
    const email = user.email?.toLowerCase() || '';
    if (adminEmails.includes(email)) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  const activeSnapshotQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(
      collection(db, 'utility_bills'), 
      where('isSnapshot', '==', true),
      orderBy('monthYear', 'desc'), 
      limit(1)
    );
  }, [db, isSuperAdmin]);

  const { data: activeSnapshots, loading: billsLoading } = useCollection(activeSnapshotQuery);

  // Synchronization effect: Populate form from database
  useEffect(() => {
    if (billsLoading || hasLoadedFromDb.current || isFormDirty) return;

    if (activeSnapshots && activeSnapshots.length > 0) {
      const bill = activeSnapshots[0] as any;
      setFormData({
        monthYear: bill.monthYear || '',
        wifi: bill.wifi?.toString() || '',
        water: bill.water?.toString() || '',
        electricity: bill.electricity?.toString() || '',
        miscellaneous: bill.miscellaneous?.toString() || '0'
      });
      hasLoadedFromDb.current = true;
    } else if (!billsLoading) {
      // If no snapshot exists in DB, set a default once
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        monthYear: prev.monthYear || defaultMonth
      }));
      hasLoadedFromDb.current = true;
    }
  }, [activeSnapshots, billsLoading, isFormDirty]);

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) router.push('/login');
      else if (!isSuperAdmin) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to access utility management."
        });
        router.push('/');
      }
    }
  }, [user, userLoading, profileLoading, isSuperAdmin, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIsFormDirty(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBill = async (e: React.FormEvent, showOnDashboard: boolean) => {
    e.preventDefault();
    if (!db || !isSuperAdmin) return;

    setIsSaving(true);

    const wifi = parseFloat(formData.wifi) || 0;
    const water = parseFloat(formData.water) || 0;
    const electricity = parseFloat(formData.electricity) || 0;
    const misc = parseFloat(formData.miscellaneous) || 0;
    const total = wifi + water + electricity + misc;

    const billData = {
      monthYear: formData.monthYear,
      wifi,
      water,
      electricity,
      miscellaneous: misc,
      total,
      updatedAt: serverTimestamp(),
      isSnapshot: showOnDashboard
    };

    const billRef = doc(db, 'utility_bills', formData.monthYear);

    setDoc(billRef, billData, { merge: true })
      .then(() => {
        toast({
          title: showOnDashboard ? "Current Billing Month Updated" : "Draft Saved",
          description: showOnDashboard 
            ? `Active cycle for ${formData.monthYear} is now the primary dashboard snapshot.`
            : `Information for ${formData.monthYear} has been saved as a hidden draft.`,
        });
        // After successful save, we can consider the form clean and synced with DB
        setIsFormDirty(false);
        hasLoadedFromDb.current = false; // Allow re-sync from DB if query updates
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: billRef.path,
          operation: 'write',
          requestResourceData: billData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" /> Current Bill Management
          </h1>
          <p className="text-muted-foreground">Manage the Active Billing Cycle shown on the resident dashboard.</p>
        </div>

        <Card className="shadow-lg border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="text-xl">Active Cycle Details</CardTitle>
            <CardDescription>Configure values for the conceptual Current Billing Month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="monthYear">Billing Month</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="monthYear" 
                    name="monthYear" 
                    type="month" 
                    value={formData.monthYear} 
                    onChange={handleInputChange} 
                    className="pl-10" 
                    required 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">This selected month defines the active cycle shown to residents.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifi">Wifi Total (OMR)</Label>
                <div className="relative">
                  <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="wifi" name="wifi" type="number" step="0.001" value={formData.wifi} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="water">Water (OMR)</Label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="water" name="water" type="number" step="0.001" value={formData.water} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="electricity">Electricity (OMR)</Label>
                <div className="relative">
                  <Lightbulb className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="electricity" name="electricity" type="number" step="0.001" value={formData.electricity} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="miscellaneous">Misc (OMR)</Label>
                <div className="relative">
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="miscellaneous" name="miscellaneous" type="number" step="0.001" value={formData.miscellaneous} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
            </div>

            {formData.monthYear && (
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Snapshot Total ({formData.monthYear})</p>
                  <p className="text-3xl font-black text-primary">
                    {(parseFloat(formData.wifi || '0') + parseFloat(formData.water || '0') + parseFloat(formData.electricity || '0') + parseFloat(formData.miscellaneous || '0')).toFixed(3)} OMR
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={(e) => handleSaveBill(e, false)} disabled={isSaving}>
                    Save Draft
                  </Button>
                  <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={(e) => handleSaveBill(e, true)} disabled={isSaving}>
                    <Send className="h-4 w-4" /> Publish to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t py-4 justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              The "Dashboard Snapshot" is purely for resident awareness.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
