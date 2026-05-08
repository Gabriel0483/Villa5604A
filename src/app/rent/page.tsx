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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { CreditCard, CheckCircle2, Clock, AlertCircle, Filter, Download } from "lucide-react"
import type { RentPayment } from "@/lib/types"

const mockPayments: RentPayment[] = [
  { id: "p1", tenantId: "1", amount: 850, date: "2023-11-01", status: "Paid" },
  { id: "p2", tenantId: "2", amount: 700, date: "2023-11-01", status: "Paid" },
  { id: "p3", tenantId: "3", amount: 1100, date: "2023-11-01", status: "Pending" },
  { id: "p4", tenantId: "4", amount: 950, date: "2023-10-01", status: "Overdue" },
  { id: "p5", tenantId: "1", amount: 850, date: "2023-10-01", status: "Paid" },
  { id: "p6", tenantId: "2", amount: 700, date: "2023-10-01", status: "Paid" },
]

const tenantNames: Record<string, string> = {
  "1": "Alice Johnson",
  "2": "Bob Smith",
  "3": "Charlie Davis",
  "4": "Diana Prince"
}

export default function RentPage() {
  const [filter, setFilter] = useState("All")

  const filteredPayments = mockPayments.filter(p => filter === "All" || p.status === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Rent Payments</h2>
          <p className="text-muted-foreground">Monitor monthly collections and outstanding balances.</p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" /> Export Statement
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,100.00</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,100.00</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$950.00</div>
            <p className="text-xs text-muted-foreground">1 payment past due</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>A comprehensive record of all rent transactions.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-accent/5 transition-colors">
                    <TableCell className="font-semibold">{tenantNames[payment.tenantId] || "Unknown"}</TableCell>
                    <TableCell>${payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "border-none",
                          payment.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                          payment.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 
                          'bg-red-100 text-red-700'
                        )}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Record Payment</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
