"use client"

import { useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Mail, Phone, Home, Edit2, Trash2 } from "lucide-react"
import type { Tenant } from "@/lib/types"

const mockTenants: Tenant[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", phone: "+1234567890", roomSizeSqFt: 150, monthlyRent: 850, leaseStart: "2023-01-15", status: "Active" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", phone: "+1234567891", roomSizeSqFt: 120, monthlyRent: 700, leaseStart: "2023-03-01", status: "Active" },
  { id: "3", name: "Charlie Davis", email: "charlie@example.com", phone: "+1234567892", roomSizeSqFt: 200, monthlyRent: 1100, leaseStart: "2022-11-10", status: "Active" },
  { id: "4", name: "Diana Prince", email: "diana@example.com", phone: "+1234567893", roomSizeSqFt: 180, monthlyRent: 950, leaseStart: "2023-05-20", status: "Active" },
]

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants)
  const [search, setSearch] = useState("")

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Tenants</h2>
          <p className="text-muted-foreground">Manage tenant profiles and lease agreements.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Tenant Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent">Monthly Rent ($)</Label>
                <Input id="rent" type="number" placeholder="800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomSize">Room Size (Sq Ft)</Label>
                <Input id="roomSize" type="number" placeholder="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Lease Start Date</Label>
                <Input id="startDate" type="date" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 relative">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-9 max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">Tenant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Room Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length > 0 ? (
                  filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="hover:bg-accent/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-primary/10">
                            <AvatarImage src={`https://picsum.photos/seed/${tenant.id}/36/36`} />
                            <AvatarFallback>{tenant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-primary">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Home className="w-3 h-3" /> Room {tenant.id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="text-sm flex items-center gap-1.5"><Mail className="w-3 h-3 text-muted-foreground" /> {tenant.email}</div>
                          <div className="text-sm flex items-center gap-1.5"><Phone className="w-3 h-3 text-muted-foreground" /> {tenant.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${tenant.monthlyRent}</TableCell>
                      <TableCell>{tenant.roomSizeSqFt} sq ft</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
