export default function RepairsPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 text-center">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Module Removed</h2>
        <p className="text-muted-foreground">The Maintenance & Repairs module is no longer available.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="text-primary font-medium hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}