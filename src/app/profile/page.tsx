
"use client"

import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Stabilize the user profile query
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef);

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
      updatedAt: serverTimestamp()
    };

    // Update User Profile
    const updatePromises = [];
    
    updatePromises.push(
      updateDoc(doc(db, 'users', user.uid), userUpdates)
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'update',
            requestResourceData: userUpdates
          });
          errorEmitter.emit('permission-error', permissionError);
          throw err;
        })
    );

    // If Resident, update linked Tenant record
    if (profile?.tenantId) {
      const tenantUpdates = {
        name: formData.name,
        phone: formData.phone,
        propertyAddress: formData.propertyAddress,
        updatedAt: serverTimestamp()
      };
      updatePromises.push(
        updateDoc(doc(db, 'tenants', profile.tenantId), tenantUpdates)
          .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
              path: `tenants/${profile.tenantId}`,
              operation: 'update',
              requestResourceData: tenantUpdates
            });
            errorEmitter.emit('permission-error', permissionError);
            throw err;
          })
      );
    }

    try {
      await Promise.all(updatePromises);
      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully saved.",
      });
    } catch (err) {
      // Errors handled by emitter/listener
    } finally {
      setIsSaving(false);
    }
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

  const isSuperAdmin = profile?.role === 'SuperAdmin';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <Badge variant={isSuperAdmin ? "default" : "secondary"} className="gap-1.5 px-3 py-1">
            {isSuperAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
            {profile?.role || 'Resident'}
          </Badge>
        </div>

        <Card className="shadow-lg border-t-4 border-primary overflow-hidden">
          <CardHeader className="bg-white border-b pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-white shadow-sm">
                <UserIcon className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">{formData.name || 'Your Profile'}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      className="pl-10" 
                      placeholder="Enter your full name" 
                      required 
                    />
                  </div>
                </div>

                {!isSuperAdmin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          className="pl-10" 
                          placeholder="+1 (555) 000-0000" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="propertyAddress">Property Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="propertyAddress" 
                          name="propertyAddress" 
                          value={formData.propertyAddress} 
                          onChange={handleInputChange} 
                          className="pl-10" 
                          placeholder="Your unit or house address" 
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 px-1">
                        Note: Address changes may be subject to verification by management.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t flex justify-between items-center py-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                Data securely synced with Firestore
              </p>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Admin Privileges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  You have full administrative access to manage all tenant records and portal settings.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-accent/5 border-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" /> Portfolio Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Your profile is authorized to manage the entire Villa 5604 property portfolio.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
