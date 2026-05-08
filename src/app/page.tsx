"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, CreditCard, Zap, Wrench, ArrowUpRight, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts"

const stats = [
  { title: "Total Tenants", value: "8", icon: Users, color: "text-blue-500", bg: "bg-blue-100" },
  { title: "Monthly Revenue", value: "$4,250", icon: CreditCard, color: "text-green-500", bg: "bg-green-100" },
  { title: "Pending Repairs", value: "3", icon: Wrench, color: "text-orange-500", bg: "bg-orange-100" },
  { title: "Unallocated Bills", value: "$320", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-100" },
]

const chartData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 4200 },
  { name: 'Mar', revenue: 3800 },
  { name: 'Apr', revenue: 4500 },
  { name: 'May', revenue: 4250 },
]

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard Overview</h2>
          <p className="text-muted-foreground">Welcome back, head tenant. Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/repairs">View Repairs</Link>
          </Button>
          <Button asChild>
            <Link href="/tenants">Add New Tenant</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-full`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +2.5% from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Insights</CardTitle>
            <CardDescription>Monthly rent collection trends for the last 5 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(31, 153, 178, 0.1)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#1F99B2' : '#5EDB9F'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your property.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: "Alice Johnson", action: "paid rent", time: "2 hours ago", type: "success" },
                { user: "Mark Smith", action: "reported a leak", time: "5 hours ago", type: "warning" },
                { user: "Utility Bill", action: "Wifi bill uploaded ($80)", time: "1 day ago", type: "info" },
                { user: "System", action: "Rent overdue for Room 4", time: "2 days ago", type: "error" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 border-b pb-3 last:border-0">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-orange-500' :
                    activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      <span className="font-bold">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
