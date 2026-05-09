"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Filter,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function RepairsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    urgency: 'Medium'
  });

  // Access Control check
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ['rielmagpantay@gmail.com', 'rielmagpantay@gmail.com@villa5604.app', 'room101@villa5604.app'];
    if (adminEmails.includes(user.email?.toLowerCase() || '')) return true;
    return profile?.role === 'SuperAdmin';
  }, [user, profile]);

  // Fetch Requests - Wait for profile to load to avoid permission flickering
  const repairsQuery = useMemoFirebase(() => {
    if (!db || !user || profileLoading) return null;
    
    if (isSuperAdmin) {
      return query(collection(db, 'maintenance_requests'), orderBy('createdAt', 'desc'));
    } else {
      // Resident query must be filtered to match security rules
      return query(
        collection(db, 'maintenance_requests'), 
        where('residentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }
  }, [db, user, isSuperAdmin, profileLoading]);

  const { data: requests, loading: requestsLoading } = useCollection(repairsQuery);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (filterStatus === 'all') return requests;
    return requests.filter(r => r.status === filterStatus);
  }, [requests, filterStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    setIsSubmitting(true);

    const requestData = {
      residentId: user.uid,
      residentName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : (user.email?.split('@')[0] || 'Resident'),
      ...formData,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(collection(db, 'maintenance_requests'), requestData)
      .then(() => {
        toast({
          title: "Request Logged",
          description: "Your maintenance request has been submitted successfully.",
        });
        setIsDialogOpen(false);
        setFormData({ title: '', description: '', category: 'Other', urgency: 'Medium' });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'maintenance_requests',
          operation: 'create',
          requestResourceData: requestData
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleUpdateStatus = (requestId: string, newStatus: string) => {
    if (!db || !isSuperAdmin) return;

    updateDoc(doc(db, 'maintenance_requests', requestId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({
        title: "Status Updated",
        description: `Request status changed to ${newStatus}.`,
      });
    }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: `maintenance_requests/${requestId}`,
        operation: 'update',
        requestResourceData: { status: newStatus }
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-amber-500 text-white';
      case 'Low': return 'bg-slate-400 text-white';
      default: return 'bg-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-500 text-white';
      case 'In Progress': return 'bg-blue-500 text-white';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'On Hold': return 'bg-slate-500 text-white';
      case 'Cancelled': return 'bg-slate-200 text-slate-500';
      default: return 'bg-slate-200';
    }
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Wrench className="h-8 w-8 text-primary" /> Maintenance & Repairs
            </h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Central oversight of all household repair requests.' : 'Submit and track maintenance requests for your unit.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isSuperAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" /> Report New Issue
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Submit Maintenance Request</DialogTitle>
                    <DialogDescription>Please provide details about the issue. Our team will review it shortly.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Summary / Subject</Label>
                      <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Leaking kitchen faucet" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Plumbing", "Electrical", "Appliances", "Carpentry", "AC/Heating", "Other"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Urgency</Label>
                        <Select value={formData.urgency} onValueChange={(v) => handleSelectChange('urgency', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Low", "Medium", "High", "Emergency"].map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Detailed Description</Label>
                      <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Please describe the issue in detail..." className="min-h-[100px]" required />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] bg-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Requests List */}
        <Card className="shadow-lg border-none overflow-hidden">
          <CardHeader className="pb-0 bg-white">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle>Request History</CardTitle>
            </div>
            <CardDescription>
              {isSuperAdmin ? `Total of ${filteredRequests.length} household requests found.` : `You have ${filteredRequests.length} active or historical requests.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md border bg-white overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Issue / Subject</TableHead>
                    {isSuperAdmin && <TableHead>Resident</TableHead>}
                    <TableHead>Category</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Last Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((req: any) => (
                      <TableRow key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="max-w-[200px]">
                          <div className="font-semibold text-slate-900 truncate">{req.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{req.description}</div>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{req.residentName}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{req.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] font-bold", getUrgencyColor(req.urgency))}>
                            {req.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <Select defaultValue={req.status} onValueChange={(v) => handleUpdateStatus(req.id, v)}>
                              <SelectTrigger className={cn("h-8 text-xs font-medium w-[120px]", getStatusColor(req.status))}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Pending", "In Progress", "On Hold", "Resolved", "Cancelled"].map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={cn("text-[10px] font-bold", getStatusColor(req.status))}>
                              {req.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground font-mono">
                          {req.updatedAt?.toDate ? req.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground italic">
                        No maintenance requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
