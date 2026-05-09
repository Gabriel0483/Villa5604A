"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Save, 
  X,
  User as UserIcon,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, updateDoc, serverTimestamp, orderBy, where, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function RepairsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    urgency: '',
    description: ''
  });

  const [adminFormData, setAdminFormData] = useState({
    status: '',
    adminNotes: ''
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
    const baseRef = collection(db, 'maintenance_requests');
    if (isSuperAdmin) {
      return query(baseRef, orderBy('createdAt', 'desc'));
    } else {
      return query(baseRef, where('residentId', '==', user.uid), orderBy('createdAt', 'desc'));
    }
  }, [db, user, isSuperAdmin]);

  const { data: requests, loading: requestsLoading } = useCollection(requestsQuery);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => 
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.residentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.roomUnit?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !profile) return;

    setIsSaving(true);
    const requestData = {
      residentId: user.uid,
      residentName: profile.firstName ? `${profile.firstName} ${profile.lastName}` : (profile.name || user.email?.split('@')[0]),
      roomUnit: profile.roomUnit || 'N/A',
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
          description: "Your maintenance request has been logged and sent to management.",
        });
        setIsSubmitDialogOpen(false);
        setFormData({ category: '', urgency: '', description: '' });
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
        setIsSaving(false);
      });
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedRequest || !isSuperAdmin) return;

    setIsSaving(true);
    const updates = {
      status: adminFormData.status,
      adminNotes: adminFormData.adminNotes,
      updatedAt: serverTimestamp()
    };

    updateDoc(doc(db, 'maintenance_requests', selectedRequest.id), updates)
      .then(() => {
        toast({
          title: "Request Updated",
          description: "The status of the maintenance request has been updated.",
        });
        setIsManageDialogOpen(false);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: `maintenance_requests/${selectedRequest.id}`,
          operation: 'update',
          requestResourceData: updates
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const openManageDialog = (request: any) => {
    setSelectedRequest(request);
    setAdminFormData({
      status: request.status,
      adminNotes: request.adminNotes || ''
    });
    setIsManageDialogOpen(true);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return <Badge className="bg-destructive text-destructive-foreground">Emergency</Badge>;
      case 'High': return <Badge variant="destructive" className="bg-red-500">High</Badge>;
      case 'Medium': return <Badge className="bg-amber-500 text-white border-none">Medium</Badge>;
      default: return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-emerald-500 text-white border-none">Completed</Badge>;
      case 'In Progress': return <Badge className="bg-sky-500 text-white border-none">In Progress</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      default: return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>;
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
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Wrench className="h-8 w-8 text-primary" /> Maintenance & Repairs
            </h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Oversee and manage villa maintenance requests.' : 'Report and track your repair requests.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search requests..." 
                className="pl-9 w-[250px] bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {!isSuperAdmin && (
              <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> New Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Submit Repair Request</DialogTitle>
                    <DialogDescription>
                      Please describe the issue in detail so we can assist you better.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitRequest} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(val) => setFormData(p => ({...p, category: val}))} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Plumbing">Plumbing</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="AC/Heating">AC/Heating</SelectItem>
                            <SelectItem value="Carpentry">Carpentry</SelectItem>
                            <SelectItem value="Cleaning">Cleaning</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Urgency</Label>
                        <Select value={formData.urgency} onValueChange={(val) => setFormData(p => ({...p, urgency: val}))} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Urgency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low (Routine)</SelectItem>
                            <SelectItem value="Medium">Medium (Fix soon)</SelectItem>
                            <SelectItem value="High">High (Needs today)</SelectItem>
                            <SelectItem value="Emergency">Emergency (Immediate)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        placeholder="Please provide details about the location and nature of the problem..." 
                        className="min-h-[120px]"
                        value={formData.description}
                        onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSaving} className="w-full">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Submit Request
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isSuperAdmin ? 'All Maintenance Requests' : 'My Requests'}</CardTitle>
                <CardDescription>Track the status of repair and maintenance tasks.</CardDescription>
              </div>
              <Badge variant="outline" className="font-semibold">{filteredRequests.length} Total</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    {isSuperAdmin && <TableHead>Resident / Room</TableHead>}
                    <TableHead>Issue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-32 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((req: any) => (
                      <TableRow key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs text-muted-foreground">
                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'Pending'}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{req.residentName}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Home className="h-2.5 w-2.5" /> Room {req.roomUnit}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {req.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">
                            {req.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{getUrgencyBadge(req.urgency)}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => openManageDialog(req)}
                          >
                            {isSuperAdmin ? <Settings className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                            {isSuperAdmin ? 'Manage' : 'Details'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-32 text-center text-muted-foreground italic">
                        No maintenance requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Manage / Details Dialog */}
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Request Details
                  </DialogTitle>
                  <DialogDescription>
                    Reference ID: {selectedRequest.id}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs uppercase font-bold">Category</span>
                      <p className="font-semibold">{selectedRequest.category}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs uppercase font-bold">Urgency</span>
                      <div>{getUrgencyBadge(selectedRequest.urgency)}</div>
                    </div>
                    {isSuperAdmin && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-xs uppercase font-bold">Resident</span>
                        <p className="font-semibold">{selectedRequest.residentName} (Unit {selectedRequest.roomUnit})</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs uppercase font-bold">Submitted On</span>
                      <p className="font-semibold">
                        {selectedRequest.createdAt?.toDate ? selectedRequest.createdAt.toDate().toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs uppercase font-bold">Description</span>
                    <p className="p-3 bg-slate-50 rounded-lg text-sm border italic">
                      "{selectedRequest.description}"
                    </p>
                  </div>

                  {isSuperAdmin ? (
                    <form onSubmit={handleUpdateStatus} className="space-y-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Update Status</Label>
                        <Select value={adminFormData.status} onValueChange={(val) => setAdminFormData(p => ({...p, status: val}))}>
                          <SelectTrigger>
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
                      <div className="space-y-2">
                        <Label>Admin Notes</Label>
                        <Textarea 
                          placeholder="Log notes about contractor visits or parts needed..." 
                          value={adminFormData.adminNotes}
                          onChange={(e) => setAdminFormData(p => ({...p, adminNotes: e.target.value}))}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isSaving} className="w-full">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Update Request
                        </Button>
                      </DialogFooter>
                    </form>
                  ) : (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-muted-foreground">Current Status</span>
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                      {selectedRequest.adminNotes && (
                        <div className="space-y-2">
                          <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Management Note
                          </span>
                          <p className="text-sm p-3 bg-primary/5 rounded-lg border border-primary/10">
                            {selectedRequest.adminNotes}
                          </p>
                        </div>
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setIsManageDialogOpen(false)}>
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}