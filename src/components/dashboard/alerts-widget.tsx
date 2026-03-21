"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  AlertTriangle,
  FileWarning,
  Calendar,
  Fuel,
  Wrench,
  ArrowRight,
  Clock,
  FileText,
  ShieldAlert,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type AlertPriority = "haute" | "moyenne" | "basse"

interface AlertItem {
  id: string
  title: string
  description: string
  time: string
  priority: AlertPriority
  type: string
}

// Mapping des types d'alerte vers les icônes
const getAlertIcon = (type: string) => {
  switch (type) {
    case "ASSURANCE_VEHICULE_EXPIREE":
    case "PERMIS_CHAUFFEUR_EXPIRE":
    case "DOCUMENT_EXPIRE":
    case "CONTRAT_FIN_PROCHE":
    case "CONTRAT_CLIENT_EXPIRATION":
      return FileWarning
    case "VISITE_TECHNIQUE_PROCHE":
    case "ENTRETIEN_A_VENIR":
      return Wrench
    case "FACTURE_IMPAYEE":
      return FileText
    default:
      return AlertTriangle
  }
}

const getPriorityStyles = (priority: AlertPriority) => {
  switch (priority) {
    case "haute":
      return {
        container: "bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500",
        icon: "text-red-500",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        badgeText: "Haute",
      }
    case "moyenne":
      return {
        container: "bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-500",
        icon: "text-orange-500",
        badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        badgeText: "Moyenne",
      }
    case "basse":
      return {
        container: "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500",
        icon: "text-yellow-500",
        badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        badgeText: "Basse",
      }
    default:
      return {
        container: "",
        icon: "",
        badge: "",
        badgeText: "",
      }
  }
}

interface AlertCardProps {
  alert: AlertItem
}

// Icon mapping object
const ALERT_ICONS: Record<string, React.ElementType> = {
  ASSURANCE_VEHICULE_EXPIREE: FileWarning,
  PERMIS_CHAUFFEUR_EXPIRE: FileWarning,
  DOCUMENT_EXPIRE: FileWarning,
  CONTRAT_FIN_PROCHE: FileWarning,
  CONTRAT_CLIENT_EXPIRATION: FileWarning,
  VISITE_TECHNIQUE_PROCHE: Wrench,
  ENTRETIEN_A_VENIR: Wrench,
  FACTURE_IMPAYEE: FileText,
  DEFAULT: AlertTriangle,
}

function AlertCard({ alert }: AlertCardProps) {
  const IconComponent = ALERT_ICONS[alert.type] || ALERT_ICONS.DEFAULT
  const styles = getPriorityStyles(alert.priority)

  return (
    <div
      className={cn(
        "group cursor-pointer rounded-lg p-3 transition-all duration-200 hover:shadow-md",
        styles.container
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm",
            styles.icon
          )}
        >
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {alert.title}
            </h4>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                styles.badge
              )}
            >
              {styles.badgeText}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {alert.description}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{alert.time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/charts')
        const result = await response.json()
        if (result.success) {
          setAlerts(result.data.alertesRecentes)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des alertes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Alertes récentes</CardTitle>
          <CardDescription>
            Aucune alerte active pour le moment
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-12 w-12 text-green-500" />
            <p>Toutes les alertes ont été résolues</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Alertes récentes</CardTitle>
        <CardDescription>
          Les {alerts.length} dernières alertes nécessitant votre attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </CardContent>
    </Card>
  )
}
