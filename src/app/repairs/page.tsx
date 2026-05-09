
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
  MessageSquareText, 
  History,
  MoreVertical,
  Filter,
  User as UserIcon,
  Home,
  ChevronRight,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function RepairsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    category: '',
    urgency: 'Medium',
    description: ''
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

  // Fetch Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    const baseQuery = collection(db, 'maintenance_requests');
    if (isSuperAdmin) {
      return query(baseQuery, orderBy('createdAt', 'desc'));
    } else {
      return query(baseQuery, where('residentId', '==', user.uid), orderBy('createdAt', 'desc'));
    }
  }, [db, user, isSuperAdmin]);

  const { data: requests, loading: requestsLoading } = useCollection(requestsQuery);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (filterStatus === 'all') return requests;
    return requests.filter(r => r.status === filterStatus);
  }, [requests, filterStatus]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !profile) return;

    setIsSubmitting(true);

    const requestData = {
      residentId: user.uid,
      residentName: `${profile.firstName} ${profile.lastName}`,
      roomUnit: profile.roomUnit || 'Unknown',
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
          description: "Your maintenance request has been sent to management.",
        });
        setFormData({ category: '', urgency: 'Medium', description: '' });
        setShowForm(false);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'maintenance_requests',
          operation: 'create',
          requestResourceData: requestData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    if (!db || !isSuperAdmin) return;

    updateDoc(doc(db, 'maintenance_requests', requestId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({
        title: "Status Updated",
        description: `Request status changed to ${newStatus}.`,
      });
    })
    .catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: `maintenance_requests/${requestId}`,
        operation: 'update',
        requestResourceData: { status: newStatus }
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

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
              {isSuperAdmin ? "Manage and track maintenance requests for the entire villa." : "Report issues or request maintenance for your room."}
            </p>
          </div>
          
          {!isSuperAdmin && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              {showForm ? <History className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "View My Requests" : "Report New Issue"}
            </Button>
          )}
        </div>

        {showForm && !isSuperAdmin ? (
          <Card className="shadow-lg border-t-4 border-primary max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>New Maintenance Request</CardTitle>
              <CardDescription>Provide details about the issue. Management will be notified immediately.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitRequest}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plumbing">Plumbing</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Appliance">Appliance</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={formData.urgency} onValueChange={(v) => setFormData(prev => ({ ...prev, urgency: v }))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low (No rush)</SelectItem>
                        <SelectItem value="Medium">Medium (Regular)</SelectItem>
                        <SelectItem value="High">High (Needs attention)</SelectItem>
                        <SelectItem value="Emergency">Emergency (Immediate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description of the issue</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe what's wrong, where it is, and when it started..." 
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4 justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Request
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {filteredRequests.length} Total Found
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {requestsLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse h-32" />
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req: any) => (
                  <Card key={req.id} className="shadow-sm border-l-4 overflow-hidden" style={{ borderLeftColor: 
                    req.urgency === 'Emergency' ? '#ef4444' : 
                    req.urgency === 'High' ? '#f97316' : 
                    req.urgency === 'Medium' ? '#3b82f6' : '#94a3b8' 
                  }}>
                    <CardHeader className="py-4 pb-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            req.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
                          )}>
                            {req.status === 'Completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                              {req.category}
                              {req.urgency === 'Emergency' && <Badge variant="destructive" className="text-[10px] h-4">EMERGENCY</Badge>}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1"><Home className="h-3 w-3" /> Unit {req.roomUnit}</span>
                              <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {req.residentName}</span>
                              <span>{req.createdAt?.toDate().toLocaleDateString()}</span>
                            </CardDescription>
                          </div>
                        </div>
                        
                        {isSuperAdmin ? (
                          <div className="flex items-center gap-2">
                            <Select 
                              defaultValue={req.status} 
                              onValueChange={(val) => handleUpdateStatus(req.id, val)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <Badge className={cn(
                            "h-6",
                            req.status === 'Completed' ? 'bg-green-500' : 
                            req.status === 'In Progress' ? 'bg-blue-500' : 
                            req.status === 'Pending' ? 'bg-amber-500' : 'bg-slate-500'
                          )}>
                            {req.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md border italic">
                        "{req.description}"
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed text-muted-foreground">
                  No maintenance requests found.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" /> Emergency Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                For life-threatening emergencies or major flooding, please call the emergency hotline directly in addition to submitting a request.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-100 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-slate-500" /> Communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Management will update the status of your request as it's being handled. Check back here for updates on progress.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
