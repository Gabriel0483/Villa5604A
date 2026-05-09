
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
  History,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Info
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function UtilitiesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [formData, setFormData] = useState({
    monthYear: '',
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
          description: "You do not have permission to access utility management."
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

    setIsSaving(true);

    const wifi = parseFloat(formData.wifi) || 0;
    const water = parseFloat(formData.water) || 0;
    const electricity = parseFloat(formData.electricity) || 0;
    const misc = parseFloat(formData.miscellaneous) || 0;
    const total = wifi + water + electricity + misc;

    // Logic: If the month being saved is in the past, it should be released automatically
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const status = formData.monthYear < currentMonthYear ? 'Released' : 'Draft';

    const billData = {
      monthYear: formData.monthYear,
      wifi,
      water,
      electricity,
      miscellaneous: misc,
      total,
      updatedAt: serverTimestamp(),
      status: status
    };

    const billRef = doc(db, 'utility_bills', formData.monthYear);

    setDoc(billRef, billData, { merge: true })
      .then(() => {
        toast({
          title: status === 'Released' ? "Historical Bill Recorded" : "Bill Drafted",
          description: status === 'Released' 
            ? `Expenses for ${formData.monthYear} have been recorded and released for trend analysis.`
            : `Draft for ${formData.monthYear} has been saved successfully.`,
        });
        setIsAddingNew(false);
        setFormData({ monthYear: '', wifi: '', water: '', electricity: '', miscellaneous: '' });
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
      wifi: bill.wifi.toString(),
      water: bill.water.toString(),
      electricity: bill.electricity.toString(),
      miscellaneous: bill.miscellaneous?.toString() || '0'
    });
    setIsAddingNew(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!db || !isSuperAdmin) return;
    
    if (confirm('Are you sure you want to delete this bill record?')) {
      deleteDoc(doc(db, 'utility_bills', billId))
        .then(() => {
          toast({
            title: "Bill Deleted",
            description: "The utility record has been removed.",
          });
        })
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: `utility_bills/${billId}`,
            operation: 'delete'
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
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
              <Zap className="h-8 w-8 text-primary" /> Utility Management
            </h1>
            <p className="text-muted-foreground">Log and track monthly shared expenses for Villa 5604.</p>
          </div>
          
          <Button onClick={() => setIsAddingNew(!isAddingNew)} className="gap-2">
            {isAddingNew ? <History className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAddingNew ? "View History" : "Add New Bill"}
          </Button>
        </div>

        {isAddingNew ? (
          <Card className="shadow-lg border-t-4 border-primary">
            <CardHeader>
              <CardTitle className="text-xl">Record Monthly Expenses</CardTitle>
              <CardDescription>Enter the total amounts for each utility category in OMR. Past months are automatically released.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveBill}>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wifi">Wifi Bill (OMR)</Label>
                    <div className="relative">
                      <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="wifi" 
                        name="wifi" 
                        type="number" 
                        step="0.001" 
                        value={formData.wifi} 
                        onChange={handleInputChange} 
                        className="pl-10" 
                        placeholder="0.000" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="water">Water Bill (OMR)</Label>
                    <div className="relative">
                      <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="water" 
                        name="water" 
                        type="number" 
                        step="0.001" 
                        value={formData.water} 
                        onChange={handleInputChange} 
                        className="pl-10" 
                        placeholder="0.000" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricity">Electricity Bill (OMR)</Label>
                    <div className="relative">
                      <Lightbulb className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="electricity" 
                        name="electricity" 
                        type="number" 
                        step="0.001" 
                        value={formData.electricity} 
                        onChange={handleInputChange} 
                        className="pl-10" 
                        placeholder="0.000" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="miscellaneous">Miscellaneous (OMR)</Label>
                    <div className="relative">
                      <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="miscellaneous" 
                        name="miscellaneous" 
                        type="number" 
                        step="0.001" 
                        value={formData.miscellaneous} 
                        onChange={handleInputChange} 
                        className="pl-10" 
                        placeholder="0.000" 
                      />
                    </div>
                  </div>
                </div>

                {formData.wifi && formData.water && formData.electricity && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex justify-between items-center">
                    <span className="font-semibold text-primary">Calculated Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      {(parseFloat(formData.wifi) + parseFloat(formData.water) + parseFloat(formData.electricity) + (parseFloat(formData.miscellaneous) || 0)).toFixed(3)} OMR
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4">
                <div className="flex gap-3 w-full justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsAddingNew(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Monthly Bill
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="shadow-lg border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Review and manage historical utility expenses.</CardDescription>
              </div>
              <Badge variant="outline" className="text-primary font-semibold">
                {bills?.length || 0} Records
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Wifi</TableHead>
                      <TableHead>Water</TableHead>
                      <TableHead>Electricity</TableHead>
                      <TableHead>Misc</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="font-bold text-primary">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : bills && bills.length > 0 ? (
                      bills.map((bill: any) => (
                        <TableRow key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-medium">
                            {new Date(bill.monthYear + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{bill.wifi.toFixed(3)}</TableCell>
                          <TableCell>{bill.water.toFixed(3)}</TableCell>
                          <TableCell>{bill.electricity.toFixed(3)}</TableCell>
                          <TableCell>{(bill.miscellaneous || 0).toFixed(3)}</TableCell>
                          <TableCell>
                            <Badge variant={bill.status === 'Released' ? 'default' : 'secondary'} className="text-[10px]">
                              {bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-primary">{bill.total.toFixed(3)} OMR</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBill(bill)}>
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBill(bill.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No billing records found.
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
    </div>
  );
}
