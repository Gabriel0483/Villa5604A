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
  CheckCircle2,
  Table as TableIcon,
  Users,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useMemoFirebase, useUser, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, getDocs, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, isSuperAdmin]);

  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

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
        // Log errors silently
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

  const statementPreview = useMemo(() => {
    if (!residents || residents.length === 0) return [];
    
    const wifiTotal = parseFloat(formData.wifi || '0');
    const waterTotal = parseFloat(formData.water || '0');
    const elecTotal = parseFloat(formData.electricity || '0');
    const miscTotal = parseFloat(formData.miscellaneous || '0');

    const numResidents = residents.length;
    const totalManDays = residents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);
    const miscApplicableResidents = residents.filter(r => r.isMiscApplicable !== false);
    const totalMiscManDays = miscApplicableResidents.reduce((acc, r) => acc + (r.billingDays ?? 30), 0);

    const wifiSharePerPerson = wifiTotal / numResidents;
    const waterPerDay = totalManDays > 0 ? waterTotal / totalManDays : 0;
    const elecPerDay = totalManDays > 0 ? elecTotal / totalManDays : 0;
    const miscPerDay = totalMiscManDays > 0 ? miscTotal / totalMiscManDays : 0;

    return residents.map(r => {
      const resDays = r.billingDays ?? 30;
      const resWifi = wifiSharePerPerson;
      const resWater = waterPerDay * resDays;
      const resElec = elecPerDay * resDays;
      const resMisc = (r.isMiscApplicable !== false) ? (miscPerDay * resDays) : 0;
      const total = (r.monthlyRent || 0) + resWifi + resWater + resElec + resMisc;

      return {
        name: `${r.firstName} ${r.lastName}`,
        room: r.roomUnit || 'N/A',
        rent: r.monthlyRent || 0,
        wifi: resWifi,
        water: resWater,
        elec: resElec,
        misc: resMisc,
        total: total
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [residents, formData]);

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

  const inputClass = "pl-10 border-slate-300 focus:ring-primary font-bold h-12 md:h-10";
  const viewOnlyInputClass = "pl-10 disabled:opacity-100 disabled:text-slate-900 disabled:font-black disabled:cursor-default border-slate-300 bg-white h-12 md:h-10";

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-[10px] font-black text-slate-700 hover:text-primary transition-colors group uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-amber-50 rounded-lg md:rounded-xl text-amber-600 border border-amber-100 shadow-sm">
                <Zap className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              Latest Bills
            </h1>
          </div>
          {isSuperAdmin && (
             <Button 
                onClick={handleSaveAndRelease} 
                disabled={isSaving || !formData.startDate || !formData.endDate}
                className="w-full md:w-auto gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-xl shadow-primary/20 rounded-xl"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save & Release
              </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <Card className="shadow-2xl border-none overflow-hidden rounded-2xl md:rounded-[2rem] bg-white">
              {isLoadingRecord && (
                <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center backdrop-blur-[2px]">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}
              <CardHeader className="p-6 md:p-8 bg-slate-900 text-white">
                <CardTitle className="text-xl md:text-2xl font-black text-white">Household Totals</CardTitle>
                <CardDescription className="text-slate-400 font-bold text-xs">
                  {isSuperAdmin ? "Input utility amounts to generate individual statements." : "Overall household consumption for the current cycle."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 p-4 md:p-8 bg-slate-50 rounded-xl md:rounded-[1.5rem] border border-slate-200">
                  <div className="space-y-2 md:space-y-3">
                    <Label className="flex items-center gap-2 font-black text-slate-900 uppercase text-[9px] tracking-widest">
                      <CalendarRange className="h-4 w-4 text-primary" /> Start Date
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
                  <div className="space-y-2 md:space-y-3">
                    <Label className="flex items-center gap-2 font-black text-slate-900 uppercase text-[9px] tracking-widest">
                      <CalendarRange className="h-4 w-4 text-primary" /> End Date
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-2 md:space-y-3">
                    <Label className="font-black text-slate-900 uppercase text-[9px] tracking-widest">Wifi (OMR)</Label>
                    <div className="relative">
                      <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
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
                  <div className="space-y-2 md:space-y-3">
                    <Label className="font-black text-slate-900 uppercase text-[9px] tracking-widest">Water (OMR)</Label>
                    <div className="relative">
                      <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-2 md:space-y-3">
                    <Label className="font-black text-slate-900 uppercase text-[9px] tracking-widest">Electricity (OMR)</Label>
                    <div className="relative">
                      <Lightbulb className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
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
                  <div className="space-y-2 md:space-y-3">
                    <Label className="font-black text-slate-900 uppercase text-[9px] tracking-widest">Misc (OMR)</Label>
                    <div className="relative">
                      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
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
                
                <div className="bg-slate-900 p-6 md:p-10 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="relative z-10 text-center md:text-left space-y-1 md:space-y-2">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400">Total Household Cost</p>
                    <p className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                      {calculatedTotal} <span className="text-sm md:text-xl text-slate-500 font-bold ml-1">OMR</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isSuperAdmin && (
              <Card className="shadow-2xl border-none overflow-hidden rounded-2xl md:rounded-[2rem] bg-white">
                <CardHeader className="p-6 md:p-8 border-b">
                  <CardTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl font-black text-slate-900">
                    <TableIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" /> 
                    General Statement Preview
                  </CardTitle>
                  <CardDescription className="font-bold text-xs">
                    Itemized split for all tenants based on current household totals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-slate-900 uppercase text-[8px] md:text-[10px] tracking-widest px-4 md:px-8 py-3 md:py-4">Resident</TableHead>
                          <TableHead className="font-black text-slate-900 uppercase text-[8px] md:text-[10px] tracking-widest py-3 md:py-4">Room</TableHead>
                          <TableHead className="text-right font-black text-slate-900 uppercase text-[8px] md:text-[10px] tracking-widest px-4 md:px-8 py-3 md:py-4">Total (OMR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {residentsLoading ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                        ) : statementPreview.length > 0 ? (
                          statementPreview.map((s, idx) => (
                            <TableRow key={idx} className="hover:bg-indigo-50/30 transition-colors">
                              <TableCell className="font-bold text-slate-900 px-4 md:px-8 py-4 md:py-6">{s.name}</TableCell>
                              <TableCell className="font-black text-slate-600 uppercase text-[10px] md:text-xs">{s.room}</TableCell>
                              <TableCell className="text-right font-black text-primary px-4 md:px-8 py-4 md:py-6 text-sm md:text-lg">{s.total.toFixed(3)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={3} className="text-center py-10 italic text-slate-500 font-bold text-xs">No residents found in registry.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            <Card className="shadow-xl border-none bg-indigo-600 text-white rounded-2xl md:rounded-[2rem] overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <Users className="h-5 w-5" /> 
                  Billing Logic
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px]">1</div>
                  <p className="text-[11px] md:text-xs font-medium leading-relaxed">
                    <strong>Wifi</strong> is shared equally among all residents.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px]">2</div>
                  <p className="text-[11px] md:text-xs font-medium leading-relaxed">
                    <strong>Water & Electricity</strong> are pro-rated by billing days.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px]">3</div>
                  <p className="text-[11px] md:text-xs font-medium leading-relaxed">
                    <strong>Miscellaneous</strong> only applies if 'Misc Applicable' is enabled.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none bg-white rounded-2xl md:rounded-[2rem] p-6 md:p-8 border border-slate-200">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <Info className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 uppercase text-[9px] md:text-xs tracking-widest">Management Info</h3>
              </div>
              <p className="text-[10px] md:text-xs text-slate-600 font-bold leading-relaxed">
                Recalculates all statements on save. Ensure accurate utility data from providers before releasing.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
