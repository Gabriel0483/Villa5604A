
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
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function CurrentUtilityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

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
          const data = snapshot.docs[0].data();
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

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" /> Latest Bills
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
            <CardDescription>View current billing range and expense totals.</CardDescription>
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
                  disabled
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
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <Label>Wifi Total (OMR)</Label>
                <div className="relative">
                  <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="wifi" type="number" step="0.001" value={formData.wifi} onChange={handleInputChange} className="pl-10" placeholder="0.000" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Miscellaneous (OMR)</Label>
                <div className="relative">
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="miscellaneous" type="number" step="0.001" value={formData.miscellaneous} onChange={handleInputChange} className="pl-10" placeholder="0.000" disabled />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Water (OMR)</Label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="water" type="number" step="0.001" value={formData.water} onChange={handleInputChange} className="pl-10" placeholder="0.000" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Electricity (OMR)</Label>
                <div className="relative">
                  <Lightbulb className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="electricity" type="number" step="0.001" value={formData.electricity} onChange={handleInputChange} className="pl-10" placeholder="0.000" disabled />
                </div>
              </div>
            </div>
            
            <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Household Total</p>
                <p className="text-3xl font-black text-primary">
                  {calculatedTotal} OMR
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
