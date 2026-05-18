
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PawPrint, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  User as UserIcon,
  Home,
  CheckCircle2,
  X,
  Dog,
  Cat,
  Bird,
  Squirrel,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function PetRegistryPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [petToDelete, setPetToDelete] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    petName: '',
    type: '',
    ownerId: '',
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

  const petsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'pets'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: pets, loading: petsLoading } = useCollection(petsQuery);

  const residentsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, isSuperAdmin]);

  const { data: residents } = useCollection(residentsQuery);

  const filteredPets = useMemo(() => {
    if (!pets) return [];
    return pets.filter((p: any) => 
      p.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pets, searchTerm]);

  const handleOpenAdd = () => {
    setEditingPetId(null);
    setFormData({ petName: '', type: '', ownerId: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (pet: any) => {
    setEditingPetId(pet.id);
    setFormData({
      petName: pet.petName || '',
      type: pet.type || '',
      ownerId: pet.ownerId || '',
      description: pet.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!db || !isSuperAdmin) return;
    setIsSaving(true);

    const owner = residents?.find(r => r.id === formData.ownerId);
    if (!owner && !editingPetId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a valid pet owner." });
      setIsSaving(false);
      return;
    }

    const petData = {
      petName: formData.petName,
      type: formData.type,
      ownerId: formData.ownerId,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : (pets?.find((p:any) => p.id === editingPetId)?.ownerName || 'Unknown'),
      roomUnit: owner?.roomUnit || (pets?.find((p:any) => p.id === editingPetId)?.roomUnit || 'N/A'),
      description: formData.description,
      updatedAt: serverTimestamp(),
      ...(editingPetId ? {} : { createdAt: serverTimestamp() })
    };

    const docRef = editingPetId ? doc(db, 'pets', editingPetId) : doc(collection(db, 'pets'));

    setDoc(docRef, petData, { merge: true })
      .then(() => {
        toast({ title: editingPetId ? "Pet Updated" : "Pet Registered", description: `${formData.petName} has been recorded in the villa registry.` });
        setIsDialogOpen(false);
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: petData
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const confirmDelete = () => {
    if (!db || !petToDelete) return;
    deleteDoc(doc(db, 'pets', petToDelete))
      .then(() => {
        toast({ title: "Pet Removed", description: "The record has been deleted from the registry." });
        setPetToDelete(null);
      });
  };

  const getPetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('dog')) return <Dog className="h-5 w-5" />;
    if (t.includes('cat')) return <Cat className="h-5 w-5" />;
    if (t.includes('bird')) return <Bird className="h-5 w-5" />;
    if (t.includes('squirrel') || t.includes('hamster')) return <Squirrel className="h-5 w-5" />;
    return <PawPrint className="h-5 w-5" />;
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">Syncing Registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-[10px] font-black text-slate-600 hover:text-primary transition-colors group uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1" /> Dashboard
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
              <div className="p-2 md:p-3 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm">
                <PawPrint className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              Pet Registry
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search pets or owners..." 
                className="pl-10 h-12 md:h-11 w-full sm:w-[250px] bg-white border-slate-200 font-bold rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isSuperAdmin && (
              <Button onClick={handleOpenAdd} className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 md:h-11 px-6 shadow-xl shadow-emerald-900/10 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                <Plus className="h-4 w-4" /> Add Pet
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {petsLoading ? (
            Array(3).fill(0).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-white border-none rounded-2xl md:rounded-[2rem]" />)
          ) : filteredPets.length > 0 ? (
            filteredPets.map((pet: any) => (
              <Card key={pet.id} className="hover:shadow-2xl transition-all border-none bg-white rounded-2xl md:rounded-[2rem] overflow-hidden group">
                <CardHeader className="p-6 md:p-8 flex flex-row items-center justify-between bg-emerald-50/50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                      {getPetIcon(pet.type)}
                    </div>
                    <div>
                      <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{pet.petName}</CardTitle>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{pet.type}</p>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(pet)} className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPetToDelete(pet.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</span>
                        <span className="text-sm font-black text-slate-900">{pet.ownerName}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest gap-1 border-slate-200">
                      <Home className="h-3 w-3" /> {pet.roomUnit}
                    </Badge>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-600 text-sm font-bold line-clamp-3">
                    {pet.description || "No description provided."}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
              <PawPrint className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">No Pets Found</h3>
              <p className="text-sm text-slate-500 font-bold">The pet registry is currently empty or matches no search results.</p>
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] md:max-w-[500px] p-0 overflow-hidden rounded-2xl md:rounded-[2.5rem] border-none shadow-2xl">
            <DialogHeader className="p-6 md:p-8 bg-slate-900 text-white">
              <DialogTitle className="text-2xl font-black">{editingPetId ? 'Update Pet Record' : 'Register New Pet'}</DialogTitle>
              <DialogDescription className="text-slate-400 font-bold">Manage the domestic animal registry for Villa 5604.</DialogDescription>
            </DialogHeader>
            <div className="p-6 md:p-8 space-y-6 bg-white max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pet Name</Label>
                  <Input 
                    value={formData.petName} 
                    onChange={(e) => setFormData(p => ({...p, petName: e.target.value}))}
                    className="h-11 font-bold border-slate-300" 
                    placeholder="e.g. Max"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pet Type</Label>
                  <Input 
                    value={formData.type} 
                    onChange={(e) => setFormData(p => ({...p, type: e.target.value}))}
                    className="h-11 font-bold border-slate-300" 
                    placeholder="e.g. Golden Retriever"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pet Owner</Label>
                <Select value={formData.ownerId} onValueChange={(v) => setFormData(p => ({...p, ownerId: v}))}>
                  <SelectTrigger className="h-11 font-bold border-slate-300">
                    <SelectValue placeholder="Select a resident" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents?.map((r: any) => (
                      <SelectItem key={r.id} value={r.id} className="font-bold">
                        {r.firstName} {r.lastName} (Unit {r.roomUnit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                  className="min-h-[100px] font-bold border-slate-300" 
                  placeholder="Tell us more about the pet..."
                />
              </div>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="font-bold">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.petName || !formData.type || !formData.ownerId} className="gap-2 font-black uppercase tracking-widest text-[10px] h-11 px-8 bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {editingPetId ? 'Update Record' : 'Register Pet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!petToDelete} onOpenChange={(o) => !o && setPetToDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-xl">Delete Pet Record?</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-600">
                This will permanently remove the pet from the villa registry. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-bold">Abort</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-[10px]">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
