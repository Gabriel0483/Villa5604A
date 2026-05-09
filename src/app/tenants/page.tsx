"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  ArrowLeft, 
  UserCircle, 
  Mail, 
  Phone, 
  Calendar, 
  Activity, 
  Heart, 
  Edit3, 
  Save, 
  X, 
  Loader2,
  Filter,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TenantRegistryPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    mobile: '',
    personalEmail: '',
    bloodType: '',
    emergencyContact: ''
  });

  // Check if user is SuperAdmin
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
      'room101@villa5604.app'
    ];
    if (adminEmails.includes(user.email?.toLowerCase() || '')) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Access control redirect
  useEffect(() => {
    if (!userLoading && !profileLoading && mounted) {
      if (!user) {
        router.push('/login');
      } else if (!isSuperAdmin) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to view the Tenant Registry."
        });
        router.push('/');
      }
    }
  }, [user, userLoading, profileLoading, isSuperAdmin, router, mounted, toast]);

  // Fetch all residents
  const residentsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, isSuperAdmin]);

  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

  const filteredResidents = useMemo(() => {
    if (!residents) return [];
    return residents.filter(r => 
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mobile?.includes(searchTerm) ||
      r.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [residents, searchTerm]);

  const handleEditClick = (resident: any) => {
    setSelectedUser(resident);
    setEditFormData({
      firstName: resident.firstName || '',
      lastName: resident.lastName || '',
      dob: resident.dob || '',
      mobile: resident.mobile || '',
      personalEmail: resident.personalEmail || '',
      bloodType: resident.bloodType || '',
      emergencyContact: resident.emergencyContact || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedUser || !db) return;
    setIsSaving(true);

    const updates = {
      ...editFormData,
      name: `${editFormData.firstName} ${editFormData.lastName}`.trim(),
      updatedAt: serverTimestamp()
    };

    const userDocRef = doc(db, 'users', selectedUser.id);
    updateDoc(userDocRef, updates)
      .then(() => {
        toast({
          title: "Resident updated",
          description: "Profile changes have been successfully saved.",
        });
        setIsEditDialogOpen(false);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${selectedUser.id}`,
          operation: 'update',
          requestResourceData: updates
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (userLoading || profileLoading || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Checking credentials...</p>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Breadcrumbs & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight">Tenant Registry</h1>
            <p className="text-muted-foreground">Manage resident profiles and contact information.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search residents..." 
                className="pl-9 w-[200px] md:w-[300px] border-none focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Residents Table */}
        <Card className="shadow-lg border-none">
          <CardHeader className="pb-0">
            <CardTitle>Resident List</CardTitle>
            <CardDescription>A total of {filteredResidents.length} residents found.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md border bg-white overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[250px]">Resident Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Blood Type</TableHead>
                    <TableHead>Birth Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredResidents.length > 0 ? (
                    filteredResidents.map((resident: any) => (
                      <TableRow key={resident.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{resident.firstName} {resident.lastName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{resident.id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {resident.mobile || 'No mobile'}
                            </div>
                            {resident.personalEmail && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {resident.personalEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {resident.bloodType ? (
                            <Badge variant="outline" className={cn(
                              "font-mono",
                              resident.bloodType.includes('+') ? "text-primary border-primary/20 bg-primary/5" : "text-slate-600"
                            )}>
                              {resident.bloodType}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {resident.dob || 'Not provided'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(resident)} className="gap-2">
                            <Edit3 className="h-4 w-4" /> Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No residents found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Resident Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] overflow-hidden p-0">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Edit Resident Profile</DialogTitle>
                <DialogDescription>
                  Updating information for {selectedUser?.firstName} {selectedUser?.lastName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" value={editFormData.firstName} onChange={handleEditFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" value={editFormData.lastName} onChange={handleEditFormChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" name="dob" type="date" value={editFormData.dob} onChange={handleEditFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input id="mobile" name="mobile" value={editFormData.mobile} onChange={handleEditFormChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personalEmail">Email Address</Label>
                <Input id="personalEmail" name="personalEmail" type="email" value={editFormData.personalEmail} onChange={handleEditFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodType">Blood Type</Label>
                <Select value={editFormData.bloodType} onValueChange={(val) => handleSelectChange('bloodType', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact Number</Label>
              <div className="relative">
                <Heart className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="emergencyContact" name="emergencyContact" className="pl-10" value={editFormData.emergencyContact} onChange={handleEditFormChange} />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
