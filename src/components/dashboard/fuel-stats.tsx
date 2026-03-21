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
import { Fuel, Droplet, Banknote, Gauge, TrendingUp, Truck, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VehiculeStats {
  id: string
  immatriculation: string
  marque: string
  modele: string
  kilometrage: number
  nbPleins: number
  totalLitres: number
  totalCout: number
  consommationMoyenne: number | null
  coutParKm: number | null
  kmParcourus: number
}

interface FuelStats {
  nbVehicules: number
  totalLitres: number
  totalCout: number
  moyennePrixL: number
  consommationMoyenne: number
  coutParKm: number
  totalKmParcourus: number
}

interface FuelStatsResponse {
  success: boolean
  data: {
    globales: FuelStats
    vehicules: VehiculeStats[]
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

export function FuelStats() {
  const [stats, setStats] = React.useState<FuelStats | null>(null)
  const [vehicules, setVehicules] = React.useState<VehiculeStats[]>([])
  const [selectedVehiculeId, setSelectedVehiculeId] = React.useState<string>("all")
  const [loading, setLoading] = React.useState(true)
  
  // Filtres année et mois
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = React.useState<string>("all")

  // Générer la liste des années (5 dernières années)
  const years = React.useMemo(() => {
    const yearsList = []
    for (let y = currentYear; y >= currentYear - 5; y--) {
      yearsList.push({ value: y.toString(), label: y.toString() })
    }
    return yearsList
  }, [currentYear])

  const fetchStats = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedYear !== "all") {
        params.append('annee', selectedYear)
      }
      if (selectedMonth !== "all") {
        params.append('mois', selectedMonth)
      }
      
      const response = await fetch(`/api/stats/carburant?${params.toString()}`)
      const data: FuelStatsResponse = await response.json()
      if (data.success) {
        setStats(data.data.globales)
        setVehicules(data.data.vehicules)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats carburant:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Get current stats based on selection
  const currentStats = React.useMemo(() => {
    if (selectedVehiculeId === "all" || !stats) {
      return {
        totalLitres: stats?.totalLitres || 0,
        totalCout: stats?.totalCout || 0,
        consommationMoyenne: stats?.consommationMoyenne || 0,
        coutParKm: stats?.coutParKm || 0,
        totalKmParcourus: stats?.totalKmParcourus || 0,
        moyennePrixL: stats?.moyennePrixL || 0,
        nbPleins: vehicules.reduce((sum, v) => sum + v.nbPleins, 0),
      }
    }

    const vehicule = vehicules.find(v => v.id === selectedVehiculeId)
    if (!vehicule) {
      return null
    }

    return {
      totalLitres: vehicule.totalLitres,
      totalCout: vehicule.totalCout,
      consommationMoyenne: vehicule.consommationMoyenne || 0,
      coutParKm: vehicule.coutParKm || 0,
      totalKmParcourus: vehicule.kmParcourus,
      moyennePrixL: vehicule.totalLitres > 0 ? vehicule.totalCout / vehicule.totalLitres : 0,
      nbPleins: vehicule.nbPleins,
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
            <Fuel className="h-5 w-5 text-[#ff6600]" />
            Statistiques Carburant
          </CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ff6600] border-t-transparent" />
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
            <Fuel className="h-5 w-5 text-[#ff6600]" />
            Statistiques Carburant
          </CardTitle>
          <CardDescription>Aucun véhicule enregistré</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée de carburant disponible</p>
            <p className="text-sm mt-1">Ajoutez des véhicules et des pleins de carburant</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statsItems = [
    {
      title: "Litres total",
      value: `${formatNumber(currentStats?.totalLitres || 0, 0)} L`,
      icon: Droplet,
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
      title: "Consommation moyenne",
      value: currentStats?.consommationMoyenne && currentStats.consommationMoyenne > 0 
        ? `${formatNumber(currentStats.consommationMoyenne, 1)} L/100km` 
        : "-",
      icon: Gauge,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-950/30",
    },
    {
      title: "Coût par km",
      value: currentStats?.coutParKm && currentStats.coutParKm > 0 
        ? `${formatNumber(currentStats.coutParKm, 2)} DH/km` 
        : "-",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-950/30",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Fuel className="h-5 w-5 text-[#ff6600]" />
                Statistiques Carburant
              </CardTitle>
              <CardDescription>
                {selectedVehiculeId === "all" 
                  ? `${stats.nbVehicules} véhicule${stats.nbVehicules > 1 ? "s" : ""} actif${stats.nbVehicules > 1 ? "s" : ""} • ${periodLabel}`
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
                  <SelectValue placeholder="Sélectionner un véhicule" />
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
                        <span className="text-xs text-muted-foreground">
                          ({vehicule.nbPleins} plein{vehicule.nbPleins > 1 ? "s" : ""})
                        </span>
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
              className={`rounded-lg p-4 ${item.bgColor} border border-transparent`}
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
        
        {(currentStats?.totalKmParcourus || 0) > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-between sm:block">
                <span className="text-muted-foreground">Distance parcourue</span>
                <span className="font-semibold sm:block sm:mt-1">{formatNumber(currentStats?.totalKmParcourus || 0, 0)} km</span>
              </div>
              <div className="flex items-center justify-between sm:block">
                <span className="text-muted-foreground">Prix moyen/L</span>
                <span className="font-semibold sm:block sm:mt-1">{formatNumber(currentStats?.moyennePrixL || 0, 2)} DH/L</span>
              </div>
              <div className="flex items-center justify-between sm:block">
                <span className="text-muted-foreground">Nombre de pleins</span>
                <span className="font-semibold sm:block sm:mt-1">{currentStats?.nbPleins || 0}</span>
              </div>
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
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Litres</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Coût</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">L/100km</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">DH/km</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Pleins</th>
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
                      <td className="text-right py-2 px-2 font-medium">{formatNumber(v.totalLitres, 0)}</td>
                      <td className="text-right py-2 px-2 font-medium text-[#ff6600]">{formatCurrency(v.totalCout)}</td>
                      <td className="text-right py-2 px-2">
                        {v.consommationMoyenne ? formatNumber(v.consommationMoyenne, 1) : "-"}
                      </td>
                      <td className="text-right py-2 px-2">
                        {v.coutParKm ? formatNumber(v.coutParKm, 2) : "-"}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">{v.nbPleins}</td>
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
