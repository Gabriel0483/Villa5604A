"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Zap, Sparkles, AlertCircle, Info, Calculator, CheckCircle2 } from "lucide-react"
import { suggestProRataMethodology, type SuggestProRataMethodologyOutput } from "@/ai/flows/suggest-pro-rata-methodology"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

const tenantsData = [
  { id: "1", name: "Alice Johnson", roomSizeSqFt: 150 },
  { id: "2", name: "Bob Smith", roomSizeSqFt: 120 },
  { id: "3", name: "Charlie Davis", roomSizeSqFt: 200 },
  { id: "4", name: "Diana Prince", roomSizeSqFt: 180 },
]

export default function UtilitiesPage() {
  const { toast } = useToast()
  const [utilityType, setUtilityType] = useState<"Wifi" | "Water" | "Electricity">("Electricity")
  const [totalAmount, setTotalAmount] = useState<number>(250)
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<SuggestProRataMethodologyOutput | null>(null)

  const handleSuggest = async () => {
    setLoading(true)
    try {
      const result = await suggestProRataMethodology({
        tenantCount: tenantsData.length,
        utilityType: utilityType,
        totalBillAmount: totalAmount,
        tenantDetails: tenantsData.map(t => ({
          id: t.id,
          name: t.name,
          roomSizeSqFt: t.roomSizeSqFt
        }))
      })
      setSuggestion(result)
      toast({
        title: "Strategy Generated",
        description: `Recommended methodology: ${result.methodologyName}`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate allocation suggestion."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Utility Allocator</h2>
        <p className="text-muted-foreground">Input bills and distribute costs fairly among tenants.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Bill Details
            </CardTitle>
            <CardDescription>Enter the latest bill information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Utility Type</Label>
              <Select 
                value={utilityType} 
                onValueChange={(v) => setUtilityType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electricity">Electricity</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                  <SelectItem value="Wifi">Wifi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Bill Amount ($)</Label>
              <Input 
                type="number" 
                value={totalAmount} 
                onChange={(e) => setTotalAmount(Number(e.target.value))}
              />
            </div>
            <div className="pt-4 space-y-3">
              <Button 
                className="w-full gap-2 bg-gradient-to-r from-primary to-[#167d93] hover:opacity-90" 
                onClick={handleSuggest}
                disabled={loading}
              >
                <Sparkles className="w-4 h-4" /> 
                {loading ? "Analyzing..." : "AI Suggest Allocation"}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <Info className="w-3 h-3" /> GenAI will suggest the fairest split based on room size and utility type.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <h4 className="font-semibold text-lg">Calculating Optimal Allocation</h4>
                <p className="text-muted-foreground">Running models based on tenant room sizes and usage patterns...</p>
              </div>
            </div>
          ) : suggestion ? (
            <div className="animate-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-primary/5">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-primary">{suggestion.methodologyName}</CardTitle>
                    <CardDescription className="mt-1">{suggestion.description}</CardDescription>
                  </div>
                  <Badge className="bg-accent text-accent-foreground hover:bg-accent">AI Recommended</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pros</h4>
                    <ul className="space-y-1">
                      {suggestion.pros.map((pro, i) => (
                        <li key={i} className="text-sm flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cons / Considerations</h4>
                    <ul className="space-y-1">
                      {suggestion.cons.map((con, i) => (
                        <li key={i} className="text-sm flex items-center gap-2 text-orange-700">
                          <AlertCircle className="w-3 h-3" /> {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Tenant</TableHead>
                        <TableHead>Allocated Amount</TableHead>
                        <TableHead>Share (%)</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestion.exampleAllocation.map((alloc, i) => {
                        const share = (alloc.allocatedAmount / totalAmount) * 100
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{alloc.tenantName}</TableCell>
                            <TableCell>${alloc.allocatedAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 w-full max-w-[120px]">
                                <Progress value={share} className="h-1.5" />
                                <span className="text-[10px] font-mono">{share.toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="text-xs">Request Payment</Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t py-4">
                <Button className="ml-auto gap-2">
                  Apply & Notify Tenants <Zap className="w-4 h-4 fill-current" />
                </Button>
              </CardFooter>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed rounded-lg">
              <div className="p-4 bg-muted rounded-full">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-semibold">No active allocation</h4>
                <p className="text-muted-foreground max-w-sm">Enter bill details and click 'AI Suggest Allocation' to generate a fair splitting strategy.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
