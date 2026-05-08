
"use client"

import React, { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, User, Home, Mail, Phone, DollarSign, Loader2 } from 'lucide-react';
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

export default function TenantsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time tenants collection
  const tenantsQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: tenants, loading } = useCollection(tenantsQuery);

  const handleAddTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const tenantData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      propertyAddress: formData.get('propertyAddress') as string,
      rentAmount: parseFloat(formData.get('rentAmount') as string),
      status: 'active',
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, 'tenants'), tenantData)
      .then(() => {
        setIsDialogOpen(false);
        toast({
          title: "Tenant added",
          description: `${tenantData.name} has been successfully added.`,
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'tenants',
          operation: 'create',
          requestResourceData: tenantData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleDeleteTenant = (tenantId: string, name: string) => {
    if (!db) return;

    deleteDoc(doc(db, 'tenants', tenantId))
      .then(() => {
        toast({
          title: "Tenant removed",
          description: `${name} has been removed from the system.`,
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

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tenant Management</h1>
          <p className="text-muted-foreground">Add and manage your tenant records.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAddTenant}>
              <DialogHeader>
                <DialogTitle>Add Tenant</DialogTitle>
                <DialogDescription>
                  Enter the details of the new tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rentAmount">Monthly Rent ($)</Label>
                    <Input id="rentAmount" name="rentAmount" type="number" step="0.01" placeholder="1200" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress">Property Address</Label>
                  <Input id="propertyAddress" name="propertyAddress" placeholder="123 Main St, Suite 4B" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                    </>
                  ) : 'Save Tenant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Current Tenants</CardTitle>
          <CardDescription>
            A list of all tenants currently in your property portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tenants && tenants.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant: any) => (
                    <TableRow key={tenant.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{tenant.name}</span>
                          <span className="text-xs text-muted-foreground">{tenant.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Home className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{tenant.propertyAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-semibold text-primary">
                          <DollarSign className="h-3 w-3" />
                          {tenant.rentAmount?.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {tenant.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No tenants found</h3>
                <p className="text-sm text-muted-foreground">Start by adding your first tenant using the button above.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
