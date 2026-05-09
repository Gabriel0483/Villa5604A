"use client"

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Cake, 
  ArrowLeft, 
  Loader2, 
  Gift, 
  PartyPopper, 
  Calendar, 
  User as UserIcon,
  Download,
  Search,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import { generateBirthdayCard, type BirthdayCardOutput } from '@/ai/flows/generate-birthday-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from 'next/link';

export default function BirthdaysPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<BirthdayCardOutput | null>(null);

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

  // Fetch residents
  const residentsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'users'), where('role', '==', 'Resident'));
  }, [db, isSuperAdmin]);

  const { data: residents, loading: residentsLoading } = useCollection(residentsQuery);

  // Calculate upcoming birthdays
  const birthdayList = useMemo(() => {
    if (!residents) return [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    return residents
      .map(r => {
        if (!r.dob) return null;
        const dob = new Date(r.dob);
        const birthdayThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        
        // If birthday has passed this year, set to next year
        if (birthdayThisYear < now && (dob.getMonth() !== currentMonth || dob.getDate() !== currentDay)) {
          birthdayThisYear.setFullYear(now.getFullYear() + 1);
        }

        const daysUntil = Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const age = now.getFullYear() - dob.getFullYear();

        return {
          ...r,
          nextBirthday: birthdayThisYear,
          daysUntil,
          turningAge: age + (birthdayThisYear.getFullYear() > dob.getFullYear() ? 0 : 1)
        };
      })
      .filter(r => r !== null)
      .sort((a, b) => a!.daysUntil - b!.daysUntil);
  }, [residents]);

  const filteredBirthdays = useMemo(() => {
    return birthdayList.filter(r => 
      `${r!.firstName} ${r!.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [birthdayList, searchTerm]);

  const handleGenerateCard = async (resident: any) => {
    setSelectedResident(resident);
    setIsGenerating(true);
    setGeneratedCard(null);

    try {
      const result = await generateBirthdayCard({
        residentName: `${resident.firstName} ${resident.lastName}`,
        age: resident.turningAge
      });
      setGeneratedCard(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate the birthday card. Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Cake className="h-8 w-8 text-primary" /> Birthday Greetings
            </h1>
            <p className="text-muted-foreground">Celebrate your residents' special days with AI-powered cards.</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search residents..." 
              className="pl-9 w-[250px] bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {residentsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-slate-100" />
                <CardContent className="h-20" />
              </Card>
            ))
          ) : filteredBirthdays.length > 0 ? (
            filteredBirthdays.map((resident: any) => (
              <Card key={resident.id} className="hover:shadow-md transition-all border-none shadow-sm relative overflow-hidden group">
                {resident.daysUntil <= 7 && (
                  <div className="absolute top-0 right-0 p-2">
                    <Badge className="bg-accent text-accent-foreground animate-bounce">
                      Soon!
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{resident.firstName} {resident.lastName}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> {new Date(resident.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Next Birthday</span>
                      <span className="font-semibold">{resident.nextBirthday.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Turning</span>
                      <Badge variant="outline" className="font-bold text-primary">{resident.turningAge} years old</Badge>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        {resident.daysUntil === 0 ? "Today is the big day!" : `${resident.daysUntil} days to go`}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full gap-2 group-hover:bg-primary group-hover:text-white transition-colors" 
                    variant="outline"
                    onClick={() => handleGenerateCard(resident)}
                  >
                    <PartyPopper className="h-4 w-4" /> Generate Birthday Card
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground italic bg-white rounded-lg border border-dashed">
              No birthdays found in the registry.
            </div>
          )}
        </div>

        {/* Card Generation Modal */}
        <Dialog open={isGenerating || !!generatedCard} onOpenChange={(open) => {
          if (!open) {
            setGeneratedCard(null);
            setSelectedResident(null);
          }
        }}>
          <DialogContent className="sm:max-w-[500px] overflow-hidden p-0 border-none shadow-2xl">
            {isGenerating ? (
              <div className="p-12 flex flex-col items-center justify-center gap-6 text-center">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <Sparkles className="h-6 w-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">Creating Magic...</h3>
                  <p className="text-muted-foreground">Using GenAI to personalize a birthday greeting and festive image for {selectedResident?.firstName}.</p>
                </div>
              </div>
            ) : generatedCard ? (
              <div className="animate-in zoom-in-95 duration-500">
                <div className="relative h-[250px] w-full">
                  <img 
                    src={generatedCard.imageUrl} 
                    alt="Birthday Celebration" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <h2 className="text-white text-3xl font-black italic tracking-tighter">
                      HAPPY BIRTHDAY!
                    </h2>
                  </div>
                </div>
                <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-widest">
                      <Gift className="h-4 w-4" /> Personalized Message
                    </div>
                    <p className="text-lg leading-relaxed text-slate-700 italic font-medium">
                      "{generatedCard.greeting}"
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <Button className="w-full gap-2" onClick={() => window.print()}>
                      <Download className="h-4 w-4" /> Save / Export Card
                    </Button>
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setGeneratedCard(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
