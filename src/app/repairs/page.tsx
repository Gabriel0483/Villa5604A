"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Wrench, Calendar, AlertTriangle, User, ChevronRight, CheckCircle2, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RepairRequest, RepairStatus, RepairPriority } from "@/lib/types"

const mockRepairs: RepairRequest[] = [
  { id: "r1", tenantId: "1", description: "Kitchen faucet is leaking continuously. Need a plumber.", priority: "Medium", status: "In Progress", dateSubmitted: "2023-11-05" },
  { id: "r2", tenantId: "2", description: "Wall socket in the bedroom not working.", priority: "High", status: "Reported", dateSubmitted: "2023-11-07" },
  { id: "r3", tenantId: "3", description: "Door lock feels loose, difficult to open.", priority: "Low", status: "Completed", dateSubmitted: "2023-10-25" },
  { id: "r4", tenantId: "1", description: "Ceiling fan making a weird noise on high speed.", priority: "Low", status: "Reported", dateSubmitted: "2023-11-08" },
]

const tenantNames: Record<string, string> = {
  "1": "Alice Johnson",
  "2": "Bob Smith",
  "3": "Charlie Davis",
  "4": "Diana Prince"
}

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<RepairRequest[]>(mockRepairs)

  const getPriorityColor = (priority: RepairPriority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Low': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: RepairStatus) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'In Progress': return <Wrench className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'Reported': return <AlertTriangle className="w-4 h-4 text-orange-500" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Repair Requests</h2>
          <p className="text-muted-foreground">Track and manage maintenance tasks across your property.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Wrench className="w-4 h-4" /> Log New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Repair Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tenantNames).map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the issue in detail..." />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="Medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {repairs.map((repair) => (
          <Card key={repair.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row">
              <div className={cn(
                "w-1.5 shrink-0",
                repair.status === 'Completed' ? 'bg-green-500' : 
                repair.status === 'In Progress' ? 'bg-blue-500' : 'bg-orange-500'
              )} />
              <div className="flex-1 p-6">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(repair.status)}
                    <span className="font-bold text-lg">{repair.status}</span>
                    <Badge variant="outline" className={cn("ml-2 font-semibold", getPriorityColor(repair.priority))}>
                      {repair.priority} Priority
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> 
                      {new Date(repair.dateSubmitted).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="w-4 h-4" /> 
                      {tenantNames[repair.tenantId]}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 border-l-2 border-muted pl-4 italic">
                  "{repair.description}"
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8">Assign Contractor</Button>
                    <Button variant="outline" size="sm" className="h-8">Mark Done</Button>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
