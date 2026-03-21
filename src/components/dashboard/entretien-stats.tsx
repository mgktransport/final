"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Wrench, Banknote, AlertTriangle, Truck, Settings, Calendar, TrendingUp, AlertCircle, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface VehiculeStats {
  id: string
  immatriculation: string
  marque: string
  modele: string
  kilometrage: number | null
  nbEntretiens: number
  totalCout: number
  coutParKm: number | null
  dernierEntretien: {
    type: string
    date: Date
    cout: number
    kilometrage: number | null
  } | null
  alertesEntretien: {
    type: string
    message: string
    urgence: 'haute' | 'moyenne' | 'basse'
  }[]
}

interface EntretienStats {
  nbVehicules: number
  totalEntretiens: number
  totalCout: number
  coutMoyenParVehicule: number
  nbAlertes: number
  alertesHauteUrgence: number
}

interface EntretienStatsResponse {
  success: boolean
  data: {
    globales: EntretienStats
    vehicules: VehiculeStats[]
    parType: Record<string, { count: number; totalCout: number }>
  }
}

const MONTHS = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
]

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
  return `${formatted} DH`
}

const formatNumber = (value: number, decimals: number = 0) => {
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function EntretienStats() {
  const [stats, setStats] = React.useState<EntretienStats | null>(null)
  const [vehicules, setVehicules] = React.useState<VehiculeStats[]>([])
  const [parType, setParType] = React.useState<Record<string, { count: number; totalCout: number }>>({})
  const [selectedVehiculeId, setSelectedVehiculeId] = React.useState<string>("all")
  const [loading, setLoading] = React.useState(true)
  
  // Filtres année et mois
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = React.useState<string>("all")

  // Générer la liste des années (5 dernières années + l'année suivante pour les prévisions)
  const years = React.useMemo(() => {
    const yearsList = []
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      yearsList.push({ value: y.toString(), label: y.toString() })
    }
    return yearsList
  }, [currentYear])

  const fetchStats = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedVehiculeId !== "all") {
        params.append('vehiculeId', selectedVehiculeId)
      }
      if (selectedYear !== "all") {
        params.append('annee', selectedYear)
      }
      if (selectedMonth !== "all") {
        params.append('mois', selectedMonth)
      }
      
      const response = await fetch(`/api/stats/entretien?${params.toString()}`)
      const data: EntretienStatsResponse = await response.json()
      if (data.success) {
        setStats(data.data.globales)
        setVehicules(data.data.vehicules)
        setParType(data.data.parType)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats entretien:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedVehiculeId, selectedYear, selectedMonth])

  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Get current stats based on selection
  const currentStats = React.useMemo(() => {
    if (selectedVehiculeId === "all" || !stats) {
      return {
        totalEntretiens: stats?.totalEntretiens || 0,
        totalCout: stats?.totalCout || 0,
        coutMoyenParVehicule: stats?.coutMoyenParVehicule || 0,
        nbAlertes: stats?.nbAlertes || 0,
        alertesHauteUrgence: stats?.alertesHauteUrgence || 0,
        nbEntretiensVehicule: vehicules.reduce((sum, v) => sum + v.nbEntretiens, 0),
      }
    }

    const vehicule = vehicules.find(v => v.id === selectedVehiculeId)
    if (!vehicule) {
      return null
    }

    return {
      totalEntretiens: vehicule.nbEntretiens,
      totalCout: vehicule.totalCout,
      coutMoyenParVehicule: 0,
      nbAlertes: vehicule.alertesEntretien.length,
      alertesHauteUrgence: vehicule.alertesEntretien.filter(a => a.urgence === 'haute').length,
      nbEntretiensVehicule: vehicule.nbEntretiens,
      dernierEntretien: vehicule.dernierEntretien,
      alertes: vehicule.alertesEntretien,
    }
  }, [selectedVehiculeId, stats, vehicules])

  // Get selected vehicle info
  const selectedVehicule = React.useMemo(() => {
    if (selectedVehiculeId === "all") return null
    return vehicules.find(v => v.id === selectedVehiculeId)
  }, [selectedVehiculeId, vehicules])

  // Get period label
  const periodLabel = React.useMemo(() => {
    if (selectedMonth === "all" && selectedYear === "all") {
      return "Toutes les périodes"
    }
    if (selectedMonth === "all") {
      return `Année ${selectedYear}`
    }
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label
    return `${monthLabel} ${selectedYear}`
  }, [selectedMonth, selectedYear])

  // Reset filters
  const resetFilters = () => {
    setSelectedYear(currentYear.toString())
    setSelectedMonth("all")
    setSelectedVehiculeId("all")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-600" />
            Statistiques Entretien
          </CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || vehicules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-600" />
            Statistiques Entretien
          </CardTitle>
          <CardDescription>Aucun véhicule enregistré</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée d'entretien disponible</p>
            <p className="text-sm mt-1">Ajoutez des véhicules et des entretiens</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statsItems = [
    {
      title: "Total entretiens",
      value: currentStats?.totalEntretiens || 0,
      icon: Settings,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-950/30",
    },
    {
      title: "Coût total",
      value: formatCurrency(currentStats?.totalCout || 0),
      icon: Banknote,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-950/30",
    },
    {
      title: "Alertes",
      value: currentStats?.nbAlertes || 0,
      icon: AlertTriangle,
      color: (currentStats?.alertesHauteUrgence || 0) > 0 ? "text-red-600" : "text-yellow-600",
      bgColor: (currentStats?.alertesHauteUrgence || 0) > 0 ? "bg-red-100 dark:bg-red-950/30" : "bg-yellow-100 dark:bg-yellow-950/30",
      alert: (currentStats?.alertesHauteUrgence || 0) > 0,
    },
    {
      title: "Coût moyen/véhicule",
      value: selectedVehiculeId === "all" 
        ? formatCurrency(currentStats?.coutMoyenParVehicule || 0)
        : (selectedVehicule?.coutParKm ? `${formatNumber(selectedVehicule.coutParKm, 2)} DH/km` : "-"),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-950/30",
    },
  ]

  // Get alert color
  const getAlertColor = (urgence: 'haute' | 'moyenne' | 'basse') => {
    switch (urgence) {
      case 'haute': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-400'
      case 'moyenne': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400'
      case 'basse': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="h-5 w-5 text-green-600" />
                Statistiques Entretien
              </CardTitle>
              <CardDescription>
                {selectedVehiculeId === "all" 
                  ? `${stats.nbVehicules} véhicule${stats.nbVehicules > 1 ? "s" : ""} • ${periodLabel}`
                  : selectedVehicule 
                    ? `${selectedVehicule.marque} ${selectedVehicule.modele}`
                    : ""
                }
              </CardDescription>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            {/* Year Selector */}
            <div className="flex-1 sm:max-w-[130px]">
              <label className="text-xs text-muted-foreground mb-1 block">Année</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span>Toutes</span>
                  </SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Month Selector */}
            <div className="flex-1 sm:max-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">Mois</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span>Tous les mois</span>
                  </SelectItem>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Vehicle Selector */}
            <div className="flex-1 sm:max-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Véhicule</label>
              <Select value={selectedVehiculeId} onValueChange={setSelectedVehiculeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Véhicule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Tous les véhicules</span>
                    </div>
                  </SelectItem>
                  {vehicules.map((vehicule) => (
                    <SelectItem key={vehicule.id} value={vehicule.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span>{vehicule.immatriculation}</span>
                        {vehicule.alertesEntretien.length > 0 && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Reset Button */}
            {(selectedYear !== currentYear.toString() || selectedMonth !== "all" || selectedVehiculeId !== "all") && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetFilters}
                className="h-9"
              >
                <Filter className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsItems.map((item, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${item.bgColor} border border-transparent ${item.alert ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.title}</span>
              </div>
              <p className={`text-xl font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Alertes */}
        {selectedVehicule && selectedVehicule.alertesEntretien.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alertes d'entretien
            </h4>
            <div className="space-y-2">
              {selectedVehicule.alertesEntretien.map((alerte, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg border ${getAlertColor(alerte.urgence)}`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{alerte.message}</span>
                  </div>
                  <Badge variant="outline" className={getAlertColor(alerte.urgence)}>
                    {alerte.urgence === 'haute' ? 'Urgent' : alerte.urgence === 'moyenne' ? 'Bientôt' : 'À prévoir'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dernier entretien du véhicule sélectionné */}
        {selectedVehicule?.dernierEntretien && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Dernier entretien</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-semibold">{selectedVehicule.dernierEntretien.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-semibold">{formatDate(selectedVehicule.dernierEntretien.date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Coût</span>
                <p className="font-semibold text-orange-600">{formatCurrency(selectedVehicule.dernierEntretien.cout)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Kilométrage</span>
                <p className="font-semibold">
                  {selectedVehicule.dernierEntretien.kilometrage 
                    ? `${formatNumber(selectedVehicule.dernierEntretien.kilometrage)} km`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats par type d'entretien (vue globale) */}
        {selectedVehiculeId === "all" && Object.keys(parType).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Répartition par type d'entretien</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Coût total</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Coût moyen</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(parType)
                    .sort(([, a], [, b]) => b.totalCout - a.totalCout)
                    .slice(0, 6)
                    .map(([type, data]) => (
                      <tr key={type} className="border-b last:border-0">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{type}</span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2">{data.count}</td>
                        <td className="text-right py-2 px-2 font-medium text-orange-600">{formatCurrency(data.totalCout)}</td>
                        <td className="text-right py-2 px-2 text-muted-foreground">
                          {formatCurrency(Math.round(data.totalCout / data.count))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicle Details Table */}
        {selectedVehiculeId === "all" && vehicules.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Statistiques par véhicule</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Véhicule</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Entretiens</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Coût total</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Coût/km</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Alertes</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicules.map((v) => (
                    <tr 
                      key={v.id} 
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedVehiculeId(v.id)}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-mono font-medium">{v.immatriculation}</span>
                            <p className="text-xs text-muted-foreground">{v.marque} {v.modele}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-2 px-2 font-medium">{v.nbEntretiens}</td>
                      <td className="text-right py-2 px-2 font-medium text-orange-600">{formatCurrency(v.totalCout)}</td>
                      <td className="text-right py-2 px-2">
                        {v.coutParKm ? `${formatNumber(v.coutParKm, 2)} DH` : "-"}
                      </td>
                      <td className="text-center py-2 px-2">
                        {v.alertesEntretien.length > 0 ? (
                          <Badge className={v.alertesEntretien.some(a => a.urgence === 'haute') 
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400'}>
                            {v.alertesEntretien.length}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
