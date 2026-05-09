"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Save, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Users as UsersIcon,
  ShieldAlert,
  Search,
  Calendar,
  Activity,
  Heart,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Profile Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    mobile: '',
    personalEmail: '',
    bloodType: '',
    emergencyContact: ''
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Handle unauthorized access
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Stabilize the user profile query
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef);

  // Unified SuperAdmin check
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const email = user.email?.toLowerCase() || '';
    const adminEmails = [
      'rielmagpantay@gmail.com', 
      'rielmagpantay@gmail.com@villa5604.app',
      'room101@villa5604.app'
    ];
    if (adminEmails.includes(email)) return true;
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
      (u.firstName?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
      (u.lastName?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
      (u.id?.toLowerCase() || '').includes(userSearch.toLowerCase())
    );
  }, [allUsers, userSearch]);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        dob: profile.dob || '',
        mobile: profile.mobile || '',
        personalEmail: profile.personalEmail || '',
        bloodType: profile.bloodType || '',
        emergencyContact: profile.emergencyContact || ''
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSaving(true);

    const userUpdates = {
      ...formData,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      updatedAt: serverTimestamp(),
      role: isSuperAdmin ? 'SuperAdmin' : 'Resident'
    };

    const userDocRef = doc(db, 'users', user.uid);
    setDoc(userDocRef, userUpdates, { merge: true })
      .then(() => {
        toast({
          title: "Profile updated",
          description: "Your information has been successfully saved.",
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords mismatch",
        description: "The new password and confirmation password do not match.",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: "Password should be at least 6 characters long.",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await updatePassword(user, passwordData.newPassword);
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please sign out and sign back in to change your password.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || "Failed to update password.",
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg border-t-4 border-primary">
              <CardHeader className="bg-white border-b pb-6">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-white shadow-sm">
                    <UserIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Tenant Information</CardTitle>
                    <CardDescription>
                      Update your personal details for Villa 5604 registry.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="pl-10" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="dob" name="dob" type="date" value={formData.dob} onChange={handleInputChange} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} className="pl-10" placeholder="+968 0000 0000" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="personalEmail">Personal Email (Optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="personalEmail" name="personalEmail" type="email" value={formData.personalEmail} onChange={handleInputChange} className="pl-10" placeholder="your@email.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloodType">Blood Type</Label>
                      <div className="relative">
                        <Activity className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                        <Select value={formData.bloodType} onValueChange={(val) => handleSelectChange('bloodType', val)}>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select Blood Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact Number</Label>
                    <div className="relative">
                      <Heart className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="emergencyContact" name="emergencyContact" type="tel" value={formData.emergencyContact} onChange={handleInputChange} className="pl-10" placeholder="Emergency contact phone" required />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t py-4">
                  <Button type="submit" disabled={isSaving} className="w-full md:w-auto min-w-[150px] gap-2">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Profile
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Change Password Card */}
            <Card className="shadow-lg border-t-4 border-slate-300">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Security</CardTitle>
                    <CardDescription>Update your portal access password.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handlePasswordChange}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="newPassword" 
                          name="newPassword" 
                          type={showPasswords ? "text" : "password"} 
                          value={passwordData.newPassword} 
                          onChange={handlePasswordInputChange} 
                          className="pl-10" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="confirmPassword" 
                          name="confirmPassword" 
                          type={showPasswords ? "text" : "password"} 
                          value={passwordData.confirmPassword} 
                          onChange={handlePasswordInputChange} 
                          className="pl-10" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs gap-1"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showPasswords ? "Hide" : "Show"} Passwords
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t py-4">
                  <Button type="submit" variant="secondary" disabled={isChangingPassword} className="w-full md:w-auto min-w-[150px] gap-2">
                    {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Side Info / Admin Section */}
          <div className="lg:col-span-1 space-y-6">
            {isSuperAdmin ? (
              <Card className="shadow-lg border-t-4 border-accent overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldAlert className="h-5 w-5 text-accent" />
                    Admin Controls
                  </CardTitle>
                  <CardDescription>Manage user roles across the system.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search users..." 
                      className="pl-9 h-9 text-xs"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto rounded-md border">
                    {usersLoading ? (
                      <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                    ) : filteredUsers.length > 0 ? (
                      <Table>
                        <TableBody>
                          {filteredUsers.map((u: any) => (
                            <TableRow key={u.id}>
                              <TableCell className="py-2 px-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">{u.firstName} {u.lastName}</span>
                                  <span className="text-[10px] text-muted-foreground">{u.id}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 px-3 text-right">
                                <Select 
                                  defaultValue={u.role || 'Resident'} 
                                  onValueChange={(val) => handleUpdateUserRole(u.id, val)}
                                  disabled={u.id === user.uid}
                                >
                                  <SelectTrigger className="h-7 w-24 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Resident" className="text-[10px]">Resident</SelectItem>
                                    <SelectItem value="SuperAdmin" className="text-[10px]">SuperAdmin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center text-xs text-muted-foreground">No users found</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" /> Information Use
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Your personal details are used for property registry and emergency protocols. This information is securely stored and only accessible by authorized administrators.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-accent/5 border-accent/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-accent" /> Security First
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Villa 5604 uses industry-standard encryption to protect your data. Your blood type and emergency contact are vital for safety measures.
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
