
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
  CalendarRange,
  Save,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, limit, getDocs, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';

export default function CurrentUtilityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [latestDocId, setLatestDocId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!db || !user) return;

    const fetchLatest = async () => {
      setIsLoadingRecord(true);
      try {
        const q = query(
          collection(db, 'utility_bills'), 
          orderBy('startDate', 'desc'), 
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          setLatestDocId(docSnap.id);
          setFormData({
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            wifi: data.wifi?.toString() || '',
            water: data.water?.toString() || '',
            electricity: data.electricity?.toString() || '',
            miscellaneous: data.miscellaneous?.toString() || '0'
          });
        }
      } catch (error) {
        console.error("Error fetching latest utility record:", error);
      } finally {
        setIsLoadingRecord(false);
      }
    };

    fetchLatest();
  }, [db, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculatedTotal = useMemo(() => {
    const val = (parseFloat(formData.wifi || '0') + parseFloat(formData.water || '0') + parseFloat(formData.electricity || '0') + parseFloat(formData.miscellaneous || '0'));
    return isNaN(val) ? "0.000" : val.toFixed(3);
  }, [formData]);

  const handleSaveAndRelease = async () => {
    if (!db || !isSuperAdmin) return;
    setIsSaving(true);

    const monthYear = formData.endDate ? formData.endDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
    
    const billData = {
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthYear: monthYear,
      wifi: parseFloat(formData.wifi || '0'),
      water: parseFloat(formData.water || '0'),
      electricity: parseFloat(formData.electricity || '0'),
      miscellaneous: parseFloat(formData.miscellaneous || '0'),
      total: parseFloat(calculatedTotal),
      status: 'Released',
      updatedAt: serverTimestamp()
    };

    // If we have a latest ID, we update it, otherwise create new
    // For "Latest Bills", updating the most recent one is standard
    const docRef = latestDocId ? doc(db, 'utility_bills', latestDocId) : doc(collection(db, 'utility_bills'));

    setDoc(docRef, billData, { merge: true })
      .then(() => {
        toast({
          title: "Bills Released",
          description: `Utility record for ${monthYear} has been saved and released.`,
        });
        if (!latestDocId) setLatestDocId(docRef.id);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: billData
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black text-slate-800 animate-pulse uppercase tracking-widest">Syncing Records...</p>
      </div>
    );
  }

  if (!user) return null;

  const inputClass = "pl-10 border-slate-300 focus:ring-primary";
  const viewOnlyInputClass = "pl-10 disabled:opacity-100 disabled:text-slate-900 disabled:font-bold disabled:cursor-default border-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-700 hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                <Zap className="h-7 w-7" />
              </div>
              Latest Bills
            </h1>
          </div>
          {isSuperAdmin && (
             <Button 
                onClick={handleSaveAndRelease} 
                disabled={isSaving || !formData.startDate || !formData.endDate}
                className="gap-2 font-black uppercase tracking-widest text-xs h-12 px-6 shadow-lg shadow-primary/20"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save & Release
              </Button>
          )}
        </div>

        <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
          {isLoadingRecord && (
            <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center backdrop-blur-[2px]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          <CardHeader className="p-8 bg-slate-900 text-white">
            <CardTitle className="text-2xl font-black text-white">Active Cycle Details</CardTitle>
            <CardDescription className="text-slate-400 font-bold">
              {isSuperAdmin ? "Administrators can update and release the latest household totals below." : "View the overall household totals for the current billing range."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50 rounded-[1.5rem] border border-slate-200">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-black text-slate-900 uppercase text-[10px] tracking-widest">
                  <CalendarRange className="h-4 w-4 text-primary" /> Bill Start Date
                </Label>
                <Input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate} 
                  onChange={handleInputChange} 
                  disabled={!isSuperAdmin}
                  className={isSuperAdmin ? inputClass : viewOnlyInputClass}
                />
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-black text-slate-900 uppercase text-[10px] tracking-widest">
                  <CalendarRange className="h-4 w-4 text-primary" /> Bill End Date
                </Label>
                <Input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate} 
                  onChange={handleInputChange} 
                  disabled={!isSuperAdmin}
                  className={isSuperAdmin ? inputClass : viewOnlyInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                <Label className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Wifi Total (OMR)</Label>
                <div className="relative">
                  <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                  <Input 
                    name="wifi" 
                    type="number" 
                    step="0.001" 
                    value={formData.wifi} 
                    onChange={handleInputChange} 
                    className={isSuperAdmin ? inputClass : viewOnlyInputClass} 
                    placeholder="0.000" 
                    disabled={!isSuperAdmin} 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Miscellaneous (OMR)</Label>
                <div className="relative">
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                  <Input 
                    name="miscellaneous" 
                    type="number" 
                    step="0.001" 
                    value={formData.miscellaneous} 
                    onChange={handleInputChange} 
                    className={isSuperAdmin ? inputClass : viewOnlyInputClass} 
                    placeholder="0.000" 
                    disabled={!isSuperAdmin} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Water (OMR)</Label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                  <Input 
                    name="water" 
                    type="number" 
                    step="0.001" 
                    value={formData.water} 
                    onChange={handleInputChange} 
                    className={isSuperAdmin ? inputClass : viewOnlyInputClass} 
                    placeholder="0.000" 
                    disabled={!isSuperAdmin} 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Electricity (OMR)</Label>
                <div className="relative">
                  <Lightbulb className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                  <Input 
                    name="electricity" 
                    type="number" 
                    step="0.001" 
                    value={formData.electricity} 
                    onChange={handleInputChange} 
                    className={isSuperAdmin ? inputClass : viewOnlyInputClass} 
                    placeholder="0.000" 
                    disabled={!isSuperAdmin} 
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 p-10 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="relative z-10 text-center md:text-left space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Current Household Total</p>
                <p className="text-5xl font-black text-white tracking-tighter">
                  {calculatedTotal} <span className="text-xl text-slate-500 font-bold ml-1">OMR</span>
                </p>
              </div>
              {isSuperAdmin && (
                <div className="relative z-10">
                   <Badge variant="outline" className="border-primary/30 text-primary font-black uppercase tracking-[0.1em] text-[10px] px-4 py-2 bg-primary/5">
                     DRAFT MODE
                   </Badge>
                </div>
              )}
            </div>
          </CardContent>
          {isSuperAdmin && (
            <CardFooter className="p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Updates are visible to all residents immediately after saving.</p>
              <Button 
                variant="ghost" 
                className="font-bold text-slate-600 hover:text-primary"
                onClick={() => router.push('/')}
              >
                Cancel Changes
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
