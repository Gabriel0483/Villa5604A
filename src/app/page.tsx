"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Welcome</h2>
        <p className="text-muted-foreground">Select a module from the sidebar to get started.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Your clean slate is ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All previous mock data and modules have been removed. You can now start building your custom logic.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
