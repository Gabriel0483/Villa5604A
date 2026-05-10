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
    const adminEmails = [
      'rielmagpantay@gmail.com', 
      'rielmagpantay@gmail.com@villa5604.app', 
      'room101@villa5604.app', 
      'admin001@villa5604.app'
    ];
    return adminEmails.includes(user.email?.toLowerCase() || '') || profile?.role === 'SuperAdmin';
  }, [user, profile]);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user || profileLoading) return null;
    if (isSuperAdmin) return query(collection(db, 'maintenance_requests'), orderBy('createdAt', 'desc'));
    return query(collection(db, 'maintenance_requests'), where('residentId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [db, user, isSuperAdmin, profileLoading]);

  const { data: requests, loading: requestsLoading } = useCollection(requestsQuery);

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
        toast({ title: "Request Submitted", description: "Your maintenance request has been logged successfully." });
        setFormData({ category: '', urgency: '', description: '' });
        setActiveTab('history');
      })
      .catch(() => {})
      .finally(() => setIsSubmitting(false));
  };

  const handleUpdateStatus = (requestId: string, newStatus: string) => {
    if (!db || !isSuperAdmin) return;
    const docRef = doc(db, 'maintenance_requests', requestId);
    updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() })
      .then(() => toast({ title: "Status Updated", description: `Request status changed to ${newStatus}.` }))
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' }));
      });
  };

  const confirmDeleteRequest = () => {
    if (!db || !isSuperAdmin || !requestToDelete) return;
    const id = requestToDelete;
    const docRef = doc(db, 'maintenance_requests', id);
    setRequestToDelete(null);
    setIsDeleting(true);
    deleteDoc(docRef)
      .then(() => toast({ title: "Request Deleted", description: "Record removed." }))
      .finally(() => setIsDeleting(false));
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
      case 'Emergency': return <Badge variant="destructive" className="animate-pulse font-black text-[9px] px-2 py-0">Emergency</Badge>;
      case 'High': return <Badge className="bg-orange-600 font-black text-[9px] px-2 py-0">High</Badge>;
      case 'Medium': return <Badge className="bg-yellow-600 font-black text-[9px] px-2 py-0">Medium</Badge>;
      default: return <Badge variant="secondary" className="font-black text-slate-900 text-[9px] px-2 py-0">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved': return <Badge className="bg-accent text-accent-foreground font-black text-[9px] px-2 py-0"><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Resolved</Badge>;
      case 'In Progress': return <Badge className="bg-blue-600 font-black text-white text-[9px] px-2 py-0"><Clock className="h-2.5 w-2.5 mr-1" /> In Progress</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="opacity-70 border-slate-400 font-bold text-[9px] px-2 py-0">Cancelled</Badge>;
      default: return <Badge variant="outline" className="border-slate-400 text-slate-900 font-bold text-[9px] px-2 py-0"><AlertTriangle className="h-2.5 w-2.5 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight flex items-center gap-2 md:gap-3">
              <Wrench className="h-6 w-6 md:h-8 md:w-8 text-primary" /> {isSuperAdmin ? 'Manage Issues' : 'Repairs'}
            </h1>
          </div>
          
          {!isSuperAdmin && (
            <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-full md:w-auto">
              <Button 
                variant={activeTab === 'new' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('new')}
                className="flex-1 md:flex-none gap-2 font-bold text-xs"
              >
                <Plus className="h-3 w-3" /> New Request
              </Button>
              <Button 
                variant={activeTab === 'history' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('history')}
                className="flex-1 md:flex-none gap-2 font-bold text-xs"
              >
                <History className="h-3 w-3" /> History
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {(isSuperAdmin || activeTab === 'history') && (
            <Card className="shadow-lg border-none overflow-hidden rounded-2xl bg-white">
              <CardHeader className="p-4 md:p-6 border-b border-slate-200 flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 font-bold text-lg">{isSuperAdmin ? 'Resident Requests' : 'My Requests'}</CardTitle>
                <Badge variant="outline" className="font-black border-slate-300 text-slate-900 text-[10px]">
                  {requests?.length || 0} Total
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {requestsLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : requests && requests.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {requests.map((req: any) => (
                      <div key={req.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getStatusBadge(req.status)}
                              {getUrgencyBadge(req.urgency)}
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold text-[9px] px-2 py-0">
                                {req.category}
                              </Badge>
                              {isSuperAdmin && (
                                <span className="text-[9px] font-black text-slate-700 uppercase">
                                  {req.residentName} (Unit {req.roomUnit})
                                </span>
                              )}
                            </div>
                            <p className="text-slate-900 text-sm md:text-base leading-relaxed font-bold">
                              {req.description}
                            </p>
                            <div className="text-[9px] text-slate-700 font-bold flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> 
                              {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </div>
                          </div>
                          
                          {isSuperAdmin && (
                            <div className="flex items-center justify-end border-t pt-3 md:border-none md:pt-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 md:h-9 gap-1 font-bold text-[10px] md:text-xs">
                                    Action <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="font-bold">
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(req.id, 'In Progress')} className="gap-2"><Construction className="h-4 w-4" /> In Progress</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(req.id, 'Resolved')} className="gap-2"><Check className="h-4 w-4 text-accent" /> Resolved</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(req.id, 'Cancelled')} className="gap-2 text-destructive"><XCircle className="h-4 w-4" /> Cancel</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => setRequestToDelete(req.id)} className="gap-2 text-destructive font-black bg-destructive/5"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 font-bold italic text-sm">
                    No maintenance requests found.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isSuperAdmin && activeTab === 'new' && (
            <div className="max-w-2xl mx-auto w-full">
              <Card className="shadow-xl border-t-4 border-primary rounded-2xl overflow-hidden">
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-primary font-bold">Report a Problem</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmitRequest}>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-xs text-slate-900">Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))} required>
                          <SelectTrigger className="border-slate-300 h-11 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent><SelectItem value="Plumbing">Plumbing</SelectItem><SelectItem value="Electrical">Electrical</SelectItem><SelectItem value="Structural">Structural</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-xs text-slate-900">Urgency</Label>
                        <Select value={formData.urgency} onValueChange={(v) => setFormData(p => ({...p, urgency: v}))} required>
                          <SelectTrigger className="border-slate-300 h-11 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
                          <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Emergency">Emergency</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-bold text-xs text-slate-900">Issue Description</Label>
                      <Textarea id="description" placeholder="Describe the issue..." className="min-h-[120px] md:min-h-[150px] border-slate-300 text-sm" value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} required />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t p-4 md:p-6 flex justify-end">
                    <Button type="submit" className="w-full md:w-auto h-11 gap-2 font-black uppercase text-[10px] tracking-widest" disabled={isSubmitting}>
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
        <AlertDialogContent className="w-[90vw] rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle className="font-bold">Confirm Deletion</AlertDialogTitle><AlertDialogDescription>This maintenance record will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDeleteRequest(); }} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
