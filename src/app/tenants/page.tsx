"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, User, Home, Loader2, ArrowLeft, Edit, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function TenantsPage() {
  const db = useFirestore();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Stabilize the user profile query
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  // Unified SuperAdmin check matching security rules
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ['rielmagpantay@gmail.com', 'rielmagpantay@gmail.com@villa5604.app'];
    if (adminEmails.includes(user.email || '')) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  // Security Redirect: If not an admin, go back to home
  useEffect(() => {
    if (!userLoading && !profileLoading && !isSuperAdmin) {
      router.push('/');
    }
  }, [userLoading, profileLoading, isSuperAdmin, router]);

  // Only define the query if the user is an admin
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
  }, [db, isSuperAdmin]);

  const { data: tenants, loading: tenantsLoading } = useCollection(tenantsQuery);

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => 
      (t.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
      (t.propertyAddress?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [tenants, searchQuery]);

  const handleOpenDialog = (tenant: any = null) => {
    setEditingTenant(tenant);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const propertyAddress = formData.get('propertyAddress') as string;
    const rentAmountStr = formData.get('rentAmount') as string;
    const rentAmount = parseFloat(rentAmountStr);

    if (!name || !email || !propertyAddress || isNaN(rentAmount)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    
    const tenantData = {
      name,
      email,
      phone: phone || '',
      propertyAddress,
      rentAmount,
      status: editingTenant?.status || 'active',
      updatedAt: serverTimestamp(),
    };

    if (editingTenant) {
      updateDoc(doc(db, 'tenants', editingTenant.id), tenantData)
        .then(() => {
          setIsDialogOpen(false);
          toast({
            title: "Tenant updated",
            description: `${tenantData.name}'s records updated.`,
          });
        })
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: `tenants/${editingTenant.id}`,
            operation: 'update',
            requestResourceData: tenantData,
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsSubmitting(false));
    } else {
      const newTenant = { ...tenantData, createdAt: serverTimestamp() };
      addDoc(collection(db, 'tenants'), newTenant)
        .then(() => {
          setIsDialogOpen(false);
          toast({
            title: "Tenant added",
            description: `${tenantData.name} added to registry.`,
          });
        })
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: 'tenants',
            operation: 'create',
            requestResourceData: newTenant,
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleDeleteTenant = (tenantId: string, name: string) => {
    if (!db) return;

    deleteDoc(doc(db, 'tenants', tenantId))
      .then(() => {
        toast({
          title: "Tenant removed",
          description: `${name} removed from system.`,
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `tenants/${tenantId}`,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Authenticating...</p>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-500 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2 group">
            <ArrowLeft className="h-3 w-3 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tenant Management</h1>
          <p className="text-muted-foreground">Securely manage resident lease profiles.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search registry..."
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingTenant(null);
              setIsSubmitting(false);
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="h-10 px-6 gap-2 bg-primary hover:bg-primary/90 shadow-sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" /> Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
                  <DialogDescription>
                    Fill in the lease details for this resident.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" name="name" defaultValue={editingTenant?.name} placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" name="email" type="email" defaultValue={editingTenant?.email} placeholder="john@example.com" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" name="phone" defaultValue={editingTenant?.phone} placeholder="+968 0000 0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rentAmount">Monthly Rent (OMR)</Label>
                      <Input id="rentAmount" name="rentAmount" type="number" step="0.001" defaultValue={editingTenant?.rentAmount} placeholder="450.000" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyAddress">Property Address</Label>
                    <Input id="propertyAddress" name="propertyAddress" defaultValue={editingTenant?.propertyAddress} placeholder="Villa 5604, Al Mouj" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingTenant ? 'Save Changes' : 'Add Tenant')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm border-primary/5">
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="text-xl">Resident Registry</CardTitle>
          <CardDescription>
            Active lease agreements in Villa 5604.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tenantsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground">Fetching registry...</p>
            </div>
          ) : filteredTenants.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant: any) => (
                    <TableRow key={tenant.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{tenant.name}</span>
                          <span className="text-xs text-muted-foreground">{tenant.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{tenant.propertyAddress}</span>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center px-2 py-1 rounded-md bg-accent/10 text-accent-foreground font-bold text-sm">
                          <span className="text-[10px] opacity-70 mr-1">OMR</span>
                          {Number(tenant.rentAmount)?.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                          {tenant.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleOpenDialog(tenant)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTenant(tenant.id, tenant.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              No registry records found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}