"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Plus,
  Send,
  Droplets,
  Zap as ZapIcon,
  Box,
  Construction,
  Filter,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, serverTimestamp, orderBy, where, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function RepairsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isReporting, setIsReporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [reportData, setReportData] = useState({
    category: '',
    urgency: 'Medium',
    description: ''
  });

  // User Profile
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef);

  const isSuperAdmin = useMemo(() => {
    if (!user || !profile) return false;
    const adminEmails = ['rielmagpantay@gmail.com', 'room101@villa5604.app'];
    if (adminEmails.includes(user.email?.toLowerCase() || '')) return true;
    return profile.role === 'SuperAdmin';
  }, [user, profile]);

  // Requests Query
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

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSubmitting(true);

    const newRequest = {
      residentId: user.uid,
      residentName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.email?.split('@')[0],
      category: reportData.category,
      urgency: reportData.urgency,
      description: reportData.description,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(collection(db, 'maintenance_requests'), newRequest)
      .then(() => {
        toast({
          title: "Issue Reported",
          description: "Your maintenance request has been logged successfully.",
        });
        setIsReporting(false);
        setReportData({ category: '', urgency: 'Medium', description: '' });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'maintenance_requests',
          operation: 'create',
          requestResourceData: newRequest
        });
        errorEmitter.emit('permission-error', permissionError);
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
    }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: `maintenance_requests/${requestId}`,
        operation: 'update',
        requestResourceData: { status: newStatus }
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return <Badge className="bg-destructive text-white">{urgency}</Badge>;
      case 'High': return <Badge className="bg-orange-500 text-white">{urgency}</Badge>;
      case 'Medium': return <Badge variant="secondary">{urgency}</Badge>;
      case 'Low': return <Badge variant="outline">{urgency}</Badge>;
      default: return <Badge variant="ghost">{urgency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>;
      case 'In Progress': return <Badge variant="outline" className="border-blue-500 text-blue-600">In Progress</Badge>;
      case 'Resolved': return <Badge variant="outline" className="border-green-500 text-green-600">Resolved</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="border-slate-300 text-slate-400">Cancelled</Badge>;
      default: return <Badge variant="ghost">{status}</Badge>;
    }
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading maintenance module...</p>
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
              <Wrench className="h-8 w-8 text-primary" /> {isSuperAdmin ? 'Manage Issues' : 'Repairs & Maintenance'}
            </h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Review and update maintenance requests from residents.' : 'Report plumbing, electrical, or other issues in the villa.'}
            </p>
          </div>
          
          {!isSuperAdmin && (
            <Button onClick={() => setIsReporting(!isReporting)} className="gap-2">
              {isReporting ? <History className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isReporting ? "View History" : "Report New Issue"}
            </Button>
          )}
        </div>

        {isReporting ? (
          <Card className="shadow-lg border-t-4 border-primary max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Report Issue</CardTitle>
              <CardDescription>Please provide details about the maintenance required.</CardDescription>
            </CardHeader>
            <form onSubmit={handleReportSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Issue Category</Label>
                    <Select value={reportData.category} onValueChange={(val) => setReportData(prev => ({ ...prev, category: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plumbing">Plumbing (Water, Pipes, Drainage)</SelectItem>
                        <SelectItem value="Electrical">Electrical (Lights, Sockets, Wiring)</SelectItem>
                        <SelectItem value="Appliance">Appliance (Kitchen, AC, Laundry)</SelectItem>
                        <SelectItem value="Structural">Structural (Walls, Windows, Doors)</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select value={reportData.urgency} onValueChange={(val) => setReportData(prev => ({ ...prev, urgency: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low (General Improvement)</SelectItem>
                        <SelectItem value="Medium">Medium (Standard Repair)</SelectItem>
                        <SelectItem value="High">High (Needs quick attention)</SelectItem>
                        <SelectItem value="Emergency">Emergency (Safety Hazard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe exactly what happened and where..." 
                    className="min-h-[120px]"
                    value={reportData.description}
                    onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4 justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsReporting(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !reportData.category} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Report
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-lg border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-7">
                <div>
                  <CardTitle>{isSuperAdmin ? 'Active Request Pipeline' : 'My Reported Issues'}</CardTitle>
                  <CardDescription>
                    {isSuperAdmin ? 'Monitoring all resident issues across the portfolio.' : 'Tracking status of your reported villa maintenance.'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-primary font-semibold">
                  {requests?.length || 0} Records
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-white overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Issue / Date</TableHead>
                        {isSuperAdmin && <TableHead>Resident</TableHead>}
                        <TableHead>Category</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestsLoading ? (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : requests && requests.length > 0 ? (
                        requests.map((request: any) => (
                          <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="max-w-[200px]">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium truncate">{request.description}</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {request.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                                </span>
                              </div>
                            </TableCell>
                            {isSuperAdmin && (
                              <TableCell className="text-xs font-semibold">
                                {request.residentName}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                {request.category === 'Plumbing' && <Droplets className="h-3 w-3 text-blue-500" />}
                                {request.category === 'Electrical' && <ZapIcon className="h-3 w-3 text-amber-500" />}
                                {request.category === 'Appliance' && <Box className="h-3 w-3 text-slate-500" />}
                                {request.category === 'Structural' && <Construction className="h-3 w-3 text-orange-500" />}
                                {request.category}
                              </div>
                            </TableCell>
                            <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="text-right">
                              {isSuperAdmin ? (
                                <Select defaultValue={request.status} onValueChange={(val) => handleUpdateStatus(request.id, val)}>
                                  <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button variant="ghost" size="icon">
                                  <ChevronRight className="h-4 w-4 text-slate-400" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-32 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <CheckCircle2 className="h-8 w-8 opacity-20" />
                              <p>No issues found. Everything looks good!</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}