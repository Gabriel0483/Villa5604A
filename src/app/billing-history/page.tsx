
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  History, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Trash2, 
  Edit3, 
  Wifi,
  Droplets,
  Lightbulb,
  PlusCircle,
  CheckCircle2,
  Table as TableIcon,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc, orderBy, where, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function BillingHistoryPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

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

  const billsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'utility_bills'), orderBy('startDate', 'desc'));
  }, [db, isSuperAdmin]);

  const { data: bills, loading: billsLoading } = useCollection(billsQuery);

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, isSuperAdmin]);

  const { data: residents } = useCollection(residentsQuery);

  useEffect(() => {
    if (!userLoading && !profileLoading && user && !isSuperAdmin) {
      router.push('/');
    }
  }, [user, userLoading, profileLoading, isSuperAdmin, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculatedTotal = useMemo(() => {
    const val = (parseFloat(formData.wifi || '0') + parseFloat(formData.water || '0') + parseFloat(formData.electricity || '0') + parseFloat(formData.miscellaneous || '0'));
    return isNaN(val) ? "0.000" : val.toFixed(3);
  }, [formData]);

  const currentBill = useMemo(() => bills?.find(b => (b as any).id === editingBillId), [bills, editingBillId]);

  const statementPreview = useMemo(() => {
    // If the bill has captured statements, prioritize them
    if (currentBill?.itemizedStatements) {
      return currentBill.itemizedStatements.map((s: any) => ({
        ...s,
        isPaid: (currentBill as any).paidResidents?.includes(s.residentId)
      }));
    }

    // Fallback to recalculation ONLY for new bills or legacy bills without snapshots
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
      const baseRent = r.monthlyRent || 0;
      const total = baseRent + resWifi + resWater + resElec + resMisc;

      return {
        residentId: r.id,
        residentName: `${r.firstName} ${r.lastName}`,
        roomUnit: r.roomUnit || 'N/A',
        baseRent,
        wifi: resWifi,
        water: resWater,
        electricity: resElec,
        misc: resMisc,
        total: total,
        isPaid: (currentBill as any)?.paidResidents?.includes(r.id)
      };
    }).sort((a, b) => a.residentName.localeCompare(b.residentName));
  }, [residents, formData, currentBill]);

  const handleOpenAdd = () => {
    setEditingBillId(null);
    setFormData({
      startDate: '',
      endDate: '',
      wifi: '',
      water: '',
      electricity: '',
      miscellaneous: '0'
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (bill: any) => {
    setEditingBillId(bill.id);
    setFormData({
      startDate: bill.startDate || '',
      endDate: bill.endDate || '',
      wifi: bill.wifi?.toString() || '',
      water: bill.water?.toString() || '',
      electricity: bill.electricity?.toString() || '',
      miscellaneous: bill.miscellaneous?.toString() || '0'
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
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
      itemizedStatements: statementPreview.map(s => ({
        residentId: s.residentId,
        residentName: s.residentName,
        roomUnit: s.roomUnit,
        baseRent: s.baseRent,
        wifi: s.wifi,
        water: s.water,
        electricity: s.electricity,
        misc: s.misc,
        total: s.total
      })),
      updatedAt: serverTimestamp()
    };

    const docRef = editingBillId ? doc(db, 'utility_bills', editingBillId) : doc(collection(db, 'utility_bills'));

    setDoc(docRef, billData, { merge: true })
      .then(() => {
        toast({
          title: editingBillId ? "Bill Updated" : "Past Bill Logged",
          description: `Utility record and snapshots for ${monthYear} have been finalized.`,
        });
        setIsDialogOpen(false);
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: billData
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const confirmDelete = () => {
    if (!db || !billToDelete) return;
    setIsDeleting(true);
    deleteDoc(doc(db, 'utility_bills', billToDelete))
      .then(() => {
        toast({ title: "Record Deleted", description: "The utility bill has been removed from history." });
        setBillToDelete(null);
      })
      .finally(() => setIsDeleting(false));
  };

  const togglePaymentStatus = (residentId: string) => {
    if (!db || !editingBillId || !isSuperAdmin) return;
    
    const bill = bills?.find(b => (b as any).id === editingBillId);
    if (!bill) return;

    const currentPaid = (bill as any).paidResidents || [];
    const newPaid = currentPaid.includes(residentId)
      ? currentPaid.filter((id: string) => id !== residentId)
      : [...currentPaid, residentId];

    const docRef = doc(db, 'utility_bills', editingBillId);
    updateDoc(docRef, { paidResidents: newPaid })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { paidResidents: newPaid }
        }));
      });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black text-slate-800 animate-pulse uppercase tracking-widest">Loading History...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-[10px] font-black text-slate-700 hover:text-primary transition-colors group uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                <History className="h-6 w-6" />
              </div>
              Billing Archive
            </h1>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg">
            <Plus className="h-4 w-4" /> Log Past Bill
          </Button>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden rounded-2xl bg-white">
          <CardHeader className="border-b bg-slate-900 text-white">
            <CardTitle className="text-lg md:text-xl font-black">History of Utility Cycles</CardTitle>
            <CardDescription className="text-slate-400 font-bold">Manage all previously recorded utility bills.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-slate-900 uppercase text-[9px] px-6">Billing Period</TableHead>
                    <TableHead className="font-black text-slate-900 uppercase text-[9px]">Wifi</TableHead>
                    <TableHead className="font-black text-slate-900 uppercase text-[9px]">Water</TableHead>
                    <TableHead className="font-black text-slate-900 uppercase text-[9px]">Elec</TableHead>
                    <TableHead className="font-black text-slate-900 uppercase text-[9px]">Misc</TableHead>
                    <TableHead className="font-black text-slate-900 uppercase text-[9px]">Total (OMR)</TableHead>
                    <TableHead className="text-right font-black text-slate-900 uppercase text-[9px] px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billsLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : bills && bills.length > 0 ? (
                    bills.map((bill: any) => (
                      <TableRow key={bill.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="font-bold text-slate-900 px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm">{new Date(bill.startDate).toLocaleDateString()} - {new Date(bill.endDate).toLocaleDateString()}</span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{bill.monthYear}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{bill.wifi?.toFixed(3)}</TableCell>
                        <TableCell className="font-mono text-xs">{bill.water?.toFixed(3)}</TableCell>
                        <TableCell className="font-mono text-xs">{bill.electricity?.toFixed(3)}</TableCell>
                        <TableCell className="font-mono text-xs">{bill.miscellaneous?.toFixed(3)}</TableCell>
                        <TableCell className="font-black text-indigo-600 text-base">{bill.total?.toFixed(3)}</TableCell>
                        <TableCell className="text-right px-6 space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(bill)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setBillToDelete(bill.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-20 italic text-slate-500 font-bold">No historical records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
            <DialogHeader className="p-6 md:p-8 bg-slate-900 text-white">
              <DialogTitle className="text-2xl font-black">{editingBillId ? 'Edit Utility Bill' : 'Log Past Bill'}</DialogTitle>
              <DialogDescription className="text-slate-400 font-bold">Record historical utility consumption for archived statements.</DialogDescription>
            </DialogHeader>
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Start Date</Label>
                    <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="h-11 font-bold border-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">End Date</Label>
                    <Input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="h-11 font-bold border-slate-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wifi (OMR)</Label>
                    <div className="relative">
                      <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input name="wifi" type="number" step="0.001" value={formData.wifi} onChange={handleInputChange} className="pl-10 h-11 font-bold border-slate-300" placeholder="0.000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Water (OMR)</Label>
                    <div className="relative">
                      <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input name="water" type="number" step="0.001" value={formData.water} onChange={handleInputChange} className="pl-10 h-11 font-bold border-slate-300" placeholder="0.000" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Elec (OMR)</Label>
                    <div className="relative">
                      <Lightbulb className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input name="electricity" type="number" step="0.001" value={formData.electricity} onChange={handleInputChange} className="pl-10 h-11 font-bold border-slate-300" placeholder="0.000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Misc (OMR)</Label>
                    <div className="relative">
                      <PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input name="miscellaneous" type="number" step="0.001" value={formData.miscellaneous} onChange={handleInputChange} className="pl-10 h-11 font-bold border-slate-300" placeholder="0.000" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Bill OMR</span>
                  <p className="text-3xl font-black text-white tracking-tighter">{calculatedTotal}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <TableIcon className="h-4 w-4 text-indigo-600" />
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Payment & Split History</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="max-h-[350px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-[9px] font-black px-4">Resident</TableHead>
                          <TableHead className="text-right text-[9px] font-black px-4">Share (OMR)</TableHead>
                          <TableHead className="text-right text-[9px] font-black px-4">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementPreview.map((s, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-bold py-3 px-4">{s.residentName}</TableCell>
                            <TableCell className="text-right text-xs font-black text-indigo-600 px-4">{s.total.toFixed(3)}</TableCell>
                            <TableCell className="text-right px-4">
                              <Badge 
                                onClick={() => editingBillId && togglePaymentStatus(s.residentId)}
                                className={`cursor-pointer font-black uppercase text-[8px] tracking-widest py-1 px-2 rounded-full transition-all active:scale-95 ${!editingBillId ? 'opacity-50 cursor-not-allowed' : s.isPaid ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                              >
                                {s.isPaid ? 'Paid' : 'Pending'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 bg-white border-t">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="font-bold">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.startDate || !formData.endDate} className="gap-2 font-black uppercase tracking-widest text-[10px] h-11 px-8">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {editingBillId ? 'Update Record' : 'Finalize & Log'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!billToDelete} onOpenChange={(o) => !o && setBillToDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-xl">Confirm Removal</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-600">
                This historical utility record will be permanently deleted from the archive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="font-bold">Abort</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-[10px]">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
