
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
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';

export default function CurrentUtilityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(''); 
  const [formData, setFormData] = useState({
    wifi: '',
    water: '',
    electricity: '',
    miscellaneous: ''
  });

  const initializedRef = useRef(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ['rielmagpantay@gmail.com', 'rielmagpantay@gmail.com@villa5604.app', 'room101@villa5604.app', 'admin001@villa5604.app'];
    if (adminEmails.includes(user.email?.toLowerCase() || '')) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  const latestEntryQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'utility_bills'), orderBy('monthYear', 'desc'), limit(1));
  }, [db, isSuperAdmin]);

  const { data: latestEntries, loading: billsLoading } = useCollection(latestEntryQuery);

  const toStorage = (display: string) => {
    const clean = display.replace(/\s/g, '');
    const parts = clean.split('/');
    if (parts.length === 2) {
      const mm = parts[0].padStart(2, '0');
      const yyyy = parts[1];
      if (mm.length === 2 && yyyy.length === 4) return `${yyyy}-${mm}`;
    }
    return null;
  };

  const toDisplay = (storage: string) => {
    if (!storage) return '';
    const parts = storage.split('-');
    return parts.length === 2 ? `${parts[1]}/${parts[0]}` : storage;
  };

  // Sync with Firestore data on load
  useEffect(() => {
    if (!isSuperAdmin || initializedRef.current || billsLoading) return;

    if (latestEntries && latestEntries.length > 0) {
      const bill = latestEntries[0] as any;
      setFormData({
        wifi: bill.wifi?.toString() || '',
        water: bill.water?.toString() || '',
        electricity: bill.electricity?.toString() || '',
        miscellaneous: bill.miscellaneous?.toString() || '0'
      });
      setDisplayMonth(toDisplay(bill.monthYear || ''));
      initializedRef.current = true;
    }
  }, [latestEntries, isSuperAdmin, billsLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBill = async (e: React.FormEvent, showOnDashboard: boolean) => {
    e.preventDefault();
    if (!db || !isSuperAdmin) return;

    const storageMonth = toStorage(displayMonth);
    if (!storageMonth) {
      toast({ variant: "destructive", title: "Invalid Date", description: "Use MM/YYYY format (e.g. 04/2026)" });
      return;
    }

    setIsSaving(true);
    const wifi = parseFloat(formData.wifi) || 0;
    const water = parseFloat(formData.water) || 0;
    const electricity = parseFloat(formData.electricity) || 0;
    const misc = parseFloat(formData.miscellaneous) || 0;
    
    const billData = {
      monthYear: storageMonth,
      wifi, 
      water, 
      electricity, 
      miscellaneous: misc,
      total: wifi + water + electricity + misc,
      updatedAt: serverTimestamp(),
      isSnapshot: showOnDashboard === true, // Force boolean true/false
      status: 'Released'
    };

    const billRef = doc(db, 'utility_bills', storageMonth);
    setDoc(billRef, billData, { merge: true })
      .then(() => {
        toast({ title: showOnDashboard ? "Snapshot Published" : "Draft Saved", description: `Record for ${displayMonth} successfully persistent.` });
        // Close initialization ref to allow refresh if needed
        initializedRef.current = false;
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: billRef.path, operation: 'write', requestResourceData: billData }));
      })
      .finally(() => setIsSaving(false));
  };

  if (userLoading || profileLoading || (isSuperAdmin && billsLoading && !initializedRef.current)) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
            <Zap className="h-8 w-8 text-primary" /> Utility Management
          </h1>
        </div>

        <Card className="shadow-lg border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="text-xl">Active Cycle Details</CardTitle>
            <CardDescription>Enter values for the month and publish them to the portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Billing Month (MM/YYYY)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="e.g. 04/2026" value={displayMonth} onChange={(e) => setDisplayMonth(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wifi Total (OMR)</Label>
                <div className="relative">
                  <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="wifi" type="number" step="0.001" value={formData.wifi} onChange={handleInputChange} className="pl-10" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Water (OMR)</Label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="water" type="number" step="0.001" value={formData.water} onChange={handleInputChange} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Electricity (OMR)</Label>
                <div className="relative">
                  <Lightbulb className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="electricity" type="number" step="0.001" value={formData.electricity} onChange={handleInputChange} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Miscellaneous (OMR)</Label>
                <div className="relative">
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="miscellaneous" type="number" step="0.001" value={formData.miscellaneous} onChange={handleInputChange} className="pl-10" />
                </div>
              </div>
            </div>
            <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Snapshot Total</p>
                <p className="text-3xl font-black text-primary">
                  {(parseFloat(formData.wifi || '0') + parseFloat(formData.water || '0') + parseFloat(formData.electricity || '0') + parseFloat(formData.miscellaneous || '0')).toFixed(3)} OMR
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={(e) => handleSaveBill(e, false)} disabled={isSaving}>Save Draft</Button>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={(e) => handleSaveBill(e, true)} disabled={isSaving}>
                  <Send className="h-4 w-4" /> Publish to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
