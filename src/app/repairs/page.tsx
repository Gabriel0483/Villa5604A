"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Send,
  MoreVertical,
  Check,
  XCircle,
  Construction,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, serverTimestamp, orderBy, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';

export default function RepairsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    urgency: '',
    description: ''
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const email = user.email?.toLowerCase() || '';
    const adminEmails = [
      'rielmagpantay@gmail.com', 
      'rielmagpantay@gmail.com@villa5604.app', 
      'room101@villa5604.app', 
      'admin001@villa5604.app'
    ];
    if (adminEmails.includes(email)) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user || profileLoading) return null;
    
    if (isSuperAdmin) {
      return query(collection(db, 'maintenance_requests'), orderBy('createdAt', 'desc'));
    } 
    
    return query(
      collection(db, 'maintenance_requests'), 
      where('residentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, user, isSuperAdmin, profileLoading]);

  const { data: requests, loading: requestsLoading } = useCollection(requestsQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    setIsSubmitting(true);

    const requestData = {
      residentId: user.uid,
      residentName: profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (user.displayName || 'Resident'),
      roomUnit: profile?.roomUnit || 'N/A',
      category: formData.category,
      urgency: formData.urgency,
      description: formData.description,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(collection(db, 'maintenance_requests'), requestData)
      .then(() => {
        toast({
          title: "Request Submitted",
          description: "Your maintenance request has been logged successfully.",
        });
        setFormData({ category: '', urgency: '', description: '' });
        setActiveTab('history');
      })
      .catch((err) => {
        // Handled globally
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleUpdateStatus = (requestId: string, newStatus: string) => {
    if (!db || !isSuperAdmin) return;

    const docRef = doc(db, 'maintenance_requests', requestId);
    updateDoc(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({
        title: "Status Updated",
        description: `Request status changed to ${newStatus}.`,
      });
    }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { status: newStatus }
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const confirmDeleteRequest = () => {
    if (!db || !isSuperAdmin || !requestToDelete) return;
    
    const id = requestToDelete;
    const docRef = doc(db, 'maintenance_requests', id);
    
    setRequestToDelete(null);
    setIsDeleting(true);

    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Request Deleted",
          description: "The maintenance record has been removed.",
        });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return <Badge variant="destructive" className="animate-pulse font-black">Emergency</Badge>;
      case 'High': return <Badge className="bg-orange-600 font-black">High</Badge>;
      case 'Medium': return <Badge className="bg-yellow-600 font-black">Medium</Badge>;
      default: return <Badge variant="secondary" className="font-black text-slate-900">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved': return <Badge className="bg-accent text-accent-foreground font-black"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case 'In Progress': return <Badge className="bg-blue-600 font-black text-white"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="opacity-70 border-slate-400 font-bold">Cancelled</Badge>;
      default: return <Badge variant="outline" className="border-slate-400 text-slate-900 font-bold"><AlertTriangle className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-700 hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Wrench className="h-8 w-8 text-primary" /> {isSuperAdmin ? 'Manage Issues' : 'Repairs & Maintenance'}
            </h1>
          </div>
          
          {!isSuperAdmin && (
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
              <Button 
                variant={activeTab === 'new' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('new')}
                className="gap-2 font-bold"
              >
                <Plus className="h-4 w-4" /> New Request
              </Button>
              <Button 
                variant={activeTab === 'history' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('history')}
                className="gap-2 font-bold"
              >
                <History className="h-4 w-4" /> My History
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {(isSuperAdmin || activeTab === 'history') && (
            <Card className="shadow-lg border-none overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-200 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 font-bold">{isSuperAdmin ? 'Resident Requests' : 'My Requests'}</CardTitle>
                </div>
                <Badge variant="outline" className="font-black border-slate-300 text-slate-900">
                  {requests?.length || 0} Total
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {requestsLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : requests && requests.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {requests.map((req: any) => (
                      <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getStatusBadge(req.status)}
                              {getUrgencyBadge(req.urgency)}
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold">
                                {req.category}
                              </Badge>
                              {isSuperAdmin && (
                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                  {req.residentName} (Unit {req.roomUnit})
                                </span>
                              )}
                            </div>
                            <p className="text-slate-900 leading-relaxed font-bold">
                              {req.description}
                            </p>
                            <div className="text-[10px] text-slate-700 font-bold flex items-center gap-1">
                              <Clock className="h-3 w-3" /> 
                              {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'Just now'}
                            </div>
                          </div>
                          
                          {isSuperAdmin && (
                            <div className="flex items-start gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-2 font-bold border-slate-300">
                                    Action <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="font-bold">
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => handleUpdateStatus(req.id, 'In Progress')}>
                                    <Construction className="h-4 w-4 text-blue-600" /> Mark In Progress
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => handleUpdateStatus(req.id, 'Resolved')}>
                                    <Check className="h-4 w-4 text-accent" /> Mark Resolved
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 text-destructive cursor-pointer" onSelect={() => handleUpdateStatus(req.id, 'Cancelled')}>
                                    <XCircle className="h-4 w-4" /> Cancel Request
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="gap-2 text-destructive font-black cursor-pointer bg-destructive/5 hover:bg-destructive hover:text-white transition-colors" 
                                    onSelect={() => setRequestToDelete(req.id)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete Request
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-700 font-bold italic">
                    "No maintenance requests found."
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isSuperAdmin && activeTab === 'new' && (
            <div className="max-w-2xl mx-auto w-full">
              <Card className="shadow-xl border-t-4 border-primary">
                <CardHeader>
                  <CardTitle className="text-xl text-primary font-bold">Report a Problem</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmitRequest}>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-900">Category</Label>
                        <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)} required>
                          <SelectTrigger className="border-slate-300 font-medium">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="font-medium">
                            <SelectItem value="Plumbing">Plumbing</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="Structural">Structural</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-900">Urgency</Label>
                        <Select value={formData.urgency} onValueChange={(v) => handleSelectChange('urgency', v)} required>
                          <SelectTrigger className="border-slate-300 font-medium">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent className="font-medium">
                            <SelectItem value="Low">Low (Few days)</SelectItem>
                            <SelectItem value="Medium">Medium (Next 24h)</SelectItem>
                            <SelectItem value="High">High (Immediate attention)</SelectItem>
                            <SelectItem value="Emergency">Emergency (Danger/Flood)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-bold text-slate-900">Issue Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="e.g. Water leaking from the sink in Room 101..." 
                        className="min-h-[150px] resize-none border-slate-300 font-medium"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-100 border-t border-slate-200 py-4 justify-end">
                    <Button type="submit" className="gap-2 font-bold" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit Request
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && !isDeleting && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700 font-medium">
              This action cannot be undone. This will permanently delete the maintenance request from the registry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteRequest();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}