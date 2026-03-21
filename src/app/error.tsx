"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Une erreur est survenue</h2>
        <p className="text-muted-foreground mb-4">{error.message || "Erreur inconnue"}</p>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </div>
  )
}
