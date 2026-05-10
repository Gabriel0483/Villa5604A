
"use client"

import React, { useState, useMemo, useEffect } from 'react';
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
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function CurrentUtilityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    wifi: '',
    water: '',
    electricity: '',
    miscellaneous: '0'
  });

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

  // Synchronize form with Firestore based on the selected Start Date
  useEffect(() => {
    if (!db || !isSuperAdmin || !formData.startDate) return;

    const fetchRecord = async () => {
      setIsLoadingRecord(true);
      const periodId = formData.startDate.substring(0, 7);
      const docRef = doc(db, 'utility_bills', periodId);
      
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData(prev => ({
            ...prev,
            endDate: data.endDate || '',
            wifi: data.wifi?.toString() || '',
            water: data.water?.toString() || '',
            electricity: data.electricity?.toString() || '',
            miscellaneous: data.miscellaneous?.toString() || '0'
          }));
        }
      } catch (error) {
        // Handled via useCollection/useDoc logic or silent listener
      } finally {
        setIsLoadingRecord(false);
      }
    };

    fetchRecord();
  }, [db, isSuperAdmin, formData.startDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !isSuperAdmin) return;

    if (!formData.startDate || !formData.endDate) {
      toast({ 
        variant: "destructive", 
        title: "Missing Dates", 
        description: "Please define the Billing Period range." 
      });
      return;
    }

    setIsSaving(true);
    const wifi = parseFloat(formData.wifi) || 0;
    const water = parseFloat(formData.water) || 0;
    const electricity = parseFloat(formData.electricity) || 0;
    const misc = parseFloat(formData.miscellaneous) || 0;
    const periodId = formData.startDate.substring(0, 7);

    const billData = {
      monthYear: periodId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      wifi, 
      water, 
      electricity, 
      miscellaneous: misc,
      total: wifi + water + electricity + misc,
      updatedAt: serverTimestamp(),
      status: 'Released' // Auto-release to ensure residents see the update
    };

    const billRef = doc(db, 'utility_bills', periodId);
    
    setDoc(billRef, billData, { merge: true })
      .then(() => {
        toast({ 
          title: "Statement Saved", 
          description: `Utility record for ${formData.startDate} is now live.` 
        });
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: billRef.path, 
          operation: 'write', 
          requestResourceData: billData 
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const calculatedTotal = useMemo(() => {
    return (parseFloat(formData.wifi || '0') + parseFloat(formData.water || '0') + parseFloat(formData.electricity || '0') + parseFloat(formData.miscellaneous || '0')).toFixed(3);
  }, [formData]);

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
            <Zap className="h-8 w-8 text-primary" /> Utility Management
          </h1>
        </div>

        <Card className="shadow-lg border-t-4 border-primary relative overflow-hidden">
          {isLoadingRecord && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-xl">Active Cycle Details</CardTitle>
            <CardDescription>Records are automatically released to residents upon saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-primary" /> Bill Start Date
                </Label>
                <Input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-primary" /> Bill End Date
                </Label>
                <Input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <Label>Wifi Total (OMR)</Label>
                <div className="relative">
                  <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="wifi" type="number" step="0.001" value={formData.wifi} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Miscellaneous (OMR)</Label>
                <div className="relative">
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="miscellaneous" type="number" step="0.001" value={formData.miscellaneous} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Water (OMR)</Label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="water" type="number" step="0.001" value={formData.water} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Electricity (OMR)</Label>
                <div className="relative">
                  <Lightbulb className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="electricity" type="number" step="0.001" value={formData.electricity} onChange={handleInputChange} className="pl-10" placeholder="0.000" />
                </div>
              </div>
            </div>
            
            <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Calculated Total</p>
                <p className="text-3xl font-black text-primary">
                  {calculatedTotal} OMR
                </p>
              </div>
              <Button className="w-full md:w-auto min-w-[150px] gap-2" onClick={handleSaveBill} disabled={isSaving || isLoadingRecord}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Record
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
