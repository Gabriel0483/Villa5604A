
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  History, 
  Save, 
  Calendar, 
  Wifi, 
  Droplets, 
  Lightbulb, 
  Plus as PlusIcon,
  Edit2,
  Trash2,
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function SharedExpensesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    monthYear: '',
    startDate: '',
    endDate: '',
    wifi: '',
    water: '',
    electricity: '',
    miscellaneous: ''
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
    if (!userLoading && !profileLoading) {
      if (!user) router.push('/login');
      else if (!isSuperAdmin) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to access shared expenses."
        });
        router.push('/');
      }
    }
  }, [user, userLoading, profileLoading, isSuperAdmin, router, toast]);

  const billsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'utility_bills'), orderBy('monthYear', 'desc'));
  }, [db, isSuperAdmin]);

  const { data: bills, loading: billsLoading } = useCollection(billsQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !isSuperAdmin) return;

    if (!formData.startDate || !formData.endDate) {
      toast({ variant: "destructive", title: "Missing Dates", description: "Range is required." });
      return;
    }

    setIsSaving(true);
    const wifi = parseFloat(formData.wifi) || 0;
    const water = parseFloat(formData.water) || 0;
    const electricity = parseFloat(formData.electricity) || 0;
    const misc = parseFloat(formData.miscellaneous) || 0;
    const derivedMonthYear = formData.startDate.substring(0, 7);

    const billData = {
      monthYear: derivedMonthYear,
      startDate: formData.startDate,
      endDate: formData.endDate,
      wifi,
      water,
      electricity,
      miscellaneous: misc,
      total: wifi + water + electricity + misc,
      updatedAt: serverTimestamp(),
      status: 'Released'
    };

    const billRef = doc(db, 'utility_bills', derivedMonthYear);

    setDoc(billRef, billData, { merge: true })
      .then(() => {
        toast({
          title: "Expense Recorded",
          description: `History updated for period starting ${formData.startDate}.`,
        });
        setIsAddingNew(false);
        setFormData({ monthYear: '', startDate: '', endDate: '', wifi: '', water: '', electricity: '', miscellaneous: '' });
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

  const handleEditBill = (bill: any) => {
    setFormData({
      monthYear: bill.monthYear,
      startDate: bill.startDate || '',
      endDate: bill.endDate || '',
      wifi: bill.wifi?.toString() || '',
      water: bill.water?.toString() || '',
      electricity: bill.electricity?.toString() || '',
      miscellaneous: bill.miscellaneous?.toString() || '0'
    });
    setIsAddingNew(true);
  };

  const confirmDeleteBill = async () => {
    if (!db || !isSuperAdmin || !billToDelete) return;
    
    const id = billToDelete;
    setBillToDelete(null);
    setIsDeleting(true);

    deleteDoc(doc(db, 'utility_bills', id))
      .then(() => {
        toast({
          title: "Record Removed",
          description: "The expense record has been deleted.",
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `utility_bills/${id}`,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${new Date(start).toLocaleDateString('en-US', opts)} - ${new Date(end).toLocaleDateString('en-US', opts)}`;
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
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <BarChart className="h-8 w-8 text-primary" /> Shared Expenses Ledger
            </h1>
          </div>
          
          <Button onClick={() => setIsAddingNew(!isAddingNew)} className="gap-2 shadow-sm">
            {isAddingNew ? <History className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAddingNew ? "View Ledger" : "Record New Period"}
          </Button>
        </div>

        {isAddingNew ? (
          <Card className="shadow-lg border-t-4 border-primary">
            <CardHeader>
              <CardTitle className="text-xl">Record Period Expenses</CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveBill}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-primary" /> Bill Start Date
                    </Label>
                    <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-primary" /> Bill End Date
                    </Label>
                    <Input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <Label htmlFor="wifi">Wifi (OMR)</Label>
                    <Input id="wifi" name="wifi" type="number" step="0.001" value={formData.wifi} onChange={handleInputChange} placeholder="0.000" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="miscellaneous">Misc (OMR)</Label>
                    <Input id="miscellaneous" name="miscellaneous" type="number" step="0.001" value={formData.miscellaneous} onChange={handleInputChange} placeholder="0.000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="water">Water (OMR)</Label>
                    <Input id="water" name="water" type="number" step="0.001" value={formData.water} onChange={handleInputChange} placeholder="0.000" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricity">Electricity (OMR)</Label>
                    <Input id="electricity" name="electricity" type="number" step="0.001" value={formData.electricity} onChange={handleInputChange} placeholder="0.000" required />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4 justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddingNew(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Record
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-7">
              <div>
                <CardTitle>Expense Ledger</CardTitle>
                <CardDescription>Historical records derived from billing range.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Billing Range</TableHead>
                      <TableHead>Wifi</TableHead>
                      <TableHead>Water</TableHead>
                      <TableHead>Elec</TableHead>
                      <TableHead className="font-bold text-primary">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : bills && bills.length > 0 ? (
                      bills.map((bill: any) => (
                        <TableRow key={bill.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">
                            {formatDateRange(bill.startDate, bill.endDate)}
                          </TableCell>
                          <TableCell>{bill.wifi?.toFixed(3)}</TableCell>
                          <TableCell>{bill.water?.toFixed(3)}</TableCell>
                          <TableCell>{bill.electricity?.toFixed(3)}</TableCell>
                          <TableCell className="font-bold text-primary">{bill.total?.toFixed(3)} OMR</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBill(bill)}>
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setBillToDelete(bill.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                          No historical data found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && !isDeleting && setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Record?</AlertDialogTitle>
            <AlertDialogDescription>Permanent removal of this period's data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDeleteBill(); }} className="bg-destructive text-destructive-foreground" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
