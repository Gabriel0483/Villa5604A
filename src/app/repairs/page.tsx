
"use client"

import React, { useState, useMemo } from 'react';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function RepairsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

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
    } else {
      return query(
        collection(db, 'maintenance_requests'), 
        where('residentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }
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
      residentName: `${profile?.firstName} ${profile?.lastName}`,
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
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "Could not submit request. Please try again.",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
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
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!db || !isSuperAdmin) return;
    
    if (confirm('Are you sure you want to permanently delete this maintenance request?')) {
      const docRef = doc(db, 'maintenance_requests', requestId);
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
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
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
      case 'Emergency': return <Badge variant="destructive" className="animate-pulse">Emergency</Badge>;
      case 'High': return <Badge className="bg-orange-500">High</Badge>;
      case 'Medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      default: return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved': return <Badge className="bg-accent text-accent-foreground"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case 'In Progress': return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="opacity-50">Cancelled</Badge>;
      default: return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Wrench className="h-8 w-8 text-primary" /> {isSuperAdmin ? 'Manage Issues' : 'Repairs & Maintenance'}
            </h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Review and manage household repair requests.' : 'Report a problem in your room or shared areas.'}
            </p>
          </div>
          
          {!isSuperAdmin && (
            <div className="flex bg-white rounded-lg border p-1 shadow-sm">
              <Button 
                variant={activeTab === 'new' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('new')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> New Request
              </Button>
              <Button 
                variant={activeTab === 'history' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('history')}
                className="gap-2"
              >
                <History className="h-4 w-4" /> My History
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {(isSuperAdmin || activeTab === 'history') && (
            <Card className="shadow-lg border-none overflow-hidden">
              <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{isSuperAdmin ? 'Resident Requests' : 'My Requests'}</CardTitle>
                  <CardDescription>Track the status of reported issues.</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">
                  {requests?.length || 0} Total
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {requestsLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : requests && requests.length > 0 ? (
                  <div className="divide-y">
                    {requests.map((req: any) => (
                      <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getStatusBadge(req.status)}
                              {getUrgencyBadge(req.urgency)}
                              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                                {req.category}
                              </Badge>
                              {isSuperAdmin && (
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                                  {req.residentName} (Unit {req.roomUnit})
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 leading-relaxed font-medium">
                              {req.description}
                            </p>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> 
                              {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'Just now'}
                            </div>
                          </div>
                          
                          {isSuperAdmin && (
                            <div className="flex items-start gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    Action <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {req.status !== 'Resolved' && (
                                    <>
                                      <DropdownMenuItem className="gap-2" onSelect={() => handleUpdateStatus(req.id, 'In Progress')}>
                                        <Construction className="h-4 w-4 text-blue-500" /> Mark In Progress
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2" onSelect={() => handleUpdateStatus(req.id, 'Resolved')}>
                                        <Check className="h-4 w-4 text-accent" /> Mark Resolved
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 text-destructive" onSelect={() => handleUpdateStatus(req.id, 'Cancelled')}>
                                        <XCircle className="h-4 w-4" /> Cancel Request
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem 
                                    className="gap-2 text-destructive font-medium" 
                                    onSelect={() => handleDeleteRequest(req.id)}
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
                  <div className="p-12 text-center text-muted-foreground italic">
                    No maintenance requests found.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isSuperAdmin && activeTab === 'new' && (
            <div className="max-w-2xl mx-auto w-full">
              <Card className="shadow-xl border-t-4 border-primary">
                <CardHeader>
                  <CardTitle className="text-xl">Report a Problem</CardTitle>
                  <CardDescription>Provide details about the issue so we can fix it quickly.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmitRequest}>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Plumbing">Plumbing</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="Structural">Structural</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Urgency</Label>
                        <Select value={formData.urgency} onValueChange={(v) => handleSelectChange('urgency', v)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low (Few days)</SelectItem>
                            <SelectItem value="Medium">Medium (Next 24h)</SelectItem>
                            <SelectItem value="High">High (Immediate attention)</SelectItem>
                            <SelectItem value="Emergency">Emergency (Danger/Flood)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Issue Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="e.g. Water leaking from the sink in Room 101..." 
                        className="min-h-[150px] resize-none"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t py-4 justify-end">
                    <Button type="submit" className="gap-2" disabled={isSubmitting}>
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
    </div>
  );
}
