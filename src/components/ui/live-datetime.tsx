"use client"

import * as React from "react"
import { Calendar, Clock } from "lucide-react"
import { formatDateTimeDisplay, formatDateDisplay, MOROCCO_TIMEZONE } from "@/lib/date-utils"

/**
 * Live DateTime Component
 * Displays the current date and time in Morocco timezone (Africa/Casablanca)
 * Updates every minute
 */
export function LiveDateTime() {
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span className="w-20 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span className="w-12 h-4 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Format date and time using Morocco timezone
  const formattedDate = new Intl.DateTimeFormat('fr-MA', {
    timeZone: MOROCCO_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(currentTime)

  const formattedTime = new Intl.DateTimeFormat('fr-MA', {
    timeZone: MOROCCO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(currentTime)

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Calendar className="h-4 w-4 text-[#0066cc]" />
        <span className="font-medium">{formattedDate}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
        <Clock className="h-4 w-4" />
        <span>{formattedTime}</span>
      </div>
    </div>
  )
}
