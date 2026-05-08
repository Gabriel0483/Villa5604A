
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Save, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Users as UsersIcon,
  ShieldAlert,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Stabilize the user profile query
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef);

  // Unified SuperAdmin check
  const isSuperAdmin = useMemo(() => {
    if (user?.email === 'rielmagpantay@gmail.com') return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  // Fetch all users if SuperAdmin
  const usersQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'));
  }, [db, isSuperAdmin]);

  const { data: allUsers, loading: usersLoading } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      (u.name?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
      (u.id?.toLowerCase() || '').includes(userSearch.toLowerCase())
    );
  }, [allUsers, userSearch]);

  // If user is a Resident, they might have a linked Tenant record
  const tenantRef = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return doc(db, 'tenants', profile.tenantId);
  }, [db, profile]);

  const { data: tenant, loading: tenantLoading } = useDoc(tenantRef);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    propertyAddress: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
      }));
    }
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        phone: tenant.phone || '',
        propertyAddress: tenant.propertyAddress || ''
      }));
    }
  }, [profile, tenant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSaving(true);

    const userUpdates = {
      name: formData.name,
      updatedAt: serverTimestamp(),
      role: isSuperAdmin ? 'SuperAdmin' : 'Resident'
    };

    const userDocRef = doc(db, 'users', user.uid);
    setDoc(userDocRef, userUpdates, { merge: true })
      .then(() => {
        if (profile?.tenantId) {
          const tenantUpdates = {
            name: formData.name,
            phone: formData.phone,
            propertyAddress: formData.propertyAddress,
            updatedAt: serverTimestamp()
          };
          setDoc(doc(db, 'tenants', profile.tenantId), tenantUpdates, { merge: true })
            .catch(async (err) => {
              const permissionError = new FirestorePermissionError({
                path: `tenants/${profile.tenantId}`,
                operation: 'update',
                requestResourceData: tenantUpdates
              });
              errorEmitter.emit('permission-error', permissionError);
            });
        }

        toast({
          title: "Profile updated",
          description: "Your profile information has been successfully saved.",
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'write',
          requestResourceData: userUpdates
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleUpdateUserRole = (userId: string, newRole: string) => {
    if (!db) return;

    updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({
        title: "Role updated",
        description: `User role successfully changed to ${newRole}.`,
      });
    }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: `users/${userId}`,
        operation: 'update',
        requestResourceData: { role: newRole }
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <Badge variant={isSuperAdmin ? "default" : "secondary"} className="gap-1.5 px-3 py-1">
            {isSuperAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
            {isSuperAdmin ? 'SuperAdmin' : (profile?.role || 'Resident')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Profile Section */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-t-4 border-primary h-fit">
              <CardHeader className="bg-white border-b pb-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-white shadow-sm">
                    <UserIcon className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">{formData.name || 'Your Profile'}</CardTitle>
                    <CardDescription className="text-xs truncate max-w-[200px]">
                      {user.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>

                  {!isSuperAdmin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="propertyAddress">Property Address</Label>
                        <Input id="propertyAddress" name="propertyAddress" value={formData.propertyAddress} onChange={handleInputChange} />
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t flex flex-col gap-3 py-4">
                  <Button type="submit" disabled={isSaving} className="w-full gap-2">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Admin User Management Section */}
          <div className="lg:col-span-2">
            {isSuperAdmin ? (
              <Card className="shadow-lg h-full border-t-4 border-accent">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-accent" />
                        System User Management
                      </CardTitle>
                      <CardDescription>Define and update user access levels.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-48">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search users..." 
                        className="pl-9 h-9 text-xs"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {usersLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
                      <p className="text-sm text-muted-foreground">Fetching users...</p>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">User Info</TableHead>
                            <TableHead className="text-xs">Access Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((u: any) => (
                            <TableRow key={u.id} className="hover:bg-slate-50">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold">{u.name || 'Anonymous'}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{u.id}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select 
                                  defaultValue={u.role || 'Resident'} 
                                  onValueChange={(val) => handleUpdateUserRole(u.id, val)}
                                  disabled={u.id === user.uid} // Can't change your own role
                                >
                                  <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Resident" className="text-xs">Resident</SelectItem>
                                    <SelectItem value="SuperAdmin" className="text-xs">SuperAdmin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <UsersIcon className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No users found.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> Account Integrity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Your profile is securely synced. Only SuperAdmins can modify account types or system configurations.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-accent/5 border-accent/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" /> Property Scope
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      You are registered as a Resident of Villa 5604. Your portal access is restricted to your tenancy details.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
