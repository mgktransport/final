"use client"

import * as React from "react"
import { Fuel, Truck, TrendingUp, DollarSign, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface VehicleFuelStats {
  id: string
  immatriculation: string
  marque: string
  modele: string
  kilometrage: number
  nbPleins: number
  totalLitres: number
  totalCout: number
  kmParcourus: number
  consommationMoyenne: number | null
  coutParKm: number | null
}

interface StatsResponse {
  success: boolean
  data: VehicleFuelStats[]
  summary: {
    totalVehicules: number
    vehiculesAvecPleins: number
    totalLitres: number
    totalCout: number
  }
}

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `${formatted} DH`
}

const formatNumber = (value: number, decimals: number = 1) => {
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function VehicleFuelStats() {
  const [stats, setStats] = React.useState<VehicleFuelStats[]>([])
  const [summary, setSummary] = React.useState({
    totalVehicules: 0,
    vehiculesAvecPleins: 0,
    totalLitres: 0,
    totalCout: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/stats/carburant")
        const data: StatsResponse = await response.json()

        if (data.success) {
          setStats(data.data)
          setSummary(data.summary)
        } else {
          setError("Erreur lors du chargement des données")
        }
      } catch (err) {
        console.error("Erreur:", err)
        setError("Erreur de connexion")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Fuel className="h-5 w-5 text-[#ff6600]" />
            Statistiques carburant par véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Fuel className="h-5 w-5 text-[#ff6600]" />
            Statistiques carburant par véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-destructive">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (stats.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Fuel className="h-5 w-5 text-[#ff6600]" />
            Statistiques carburant par véhicule
          </CardTitle>
          <CardDescription>Aucun véhicule avec des pleins enregistrés</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Fuel className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Enregistrez des pleins de carburant pour voir les statistiques</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Fuel className="h-5 w-5 text-[#ff6600]" />
          Statistiques carburant par véhicule
        </CardTitle>
        <CardDescription>
          Consommation moyenne et coût par kilomètre
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Résumé global */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
            <Truck className="h-4 w-4 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {summary.vehiculesAvecPleins}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Véhicules</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
            <Fuel className="h-4 w-4 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
            <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
              {formatNumber(summary.totalLitres, 0)}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Litres total</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-green-600 dark:text-green-400 mb-1" />
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              {formatCurrency(summary.totalCout)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">Coût total</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
            <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              {summary.totalCout > 0 && summary.totalLitres > 0 
                ? formatNumber(summary.totalCout / summary.totalLitres, 2) 
                : "-"}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">DH/L moyen</p>
          </div>
        </div>

        {/* Tableau des véhicules */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Véhicule</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Pleins</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Litres</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Coût total</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                  <span className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    L/100km
                  </span>
                </th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                  <span className="flex items-center justify-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    DH/km
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((vehicle, index) => (
                <tr 
                  key={vehicle.id} 
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#0066cc]/10 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-[#0066cc]" />
                      </div>
                      <div>
                        <p className="font-mono font-medium">{vehicle.immatriculation}</p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle.marque} {vehicle.modele}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant="outline" className="font-mono">
                      {vehicle.nbPleins}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {formatNumber(vehicle.totalLitres, 0)}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-[#ff6600] font-medium">
                    {formatCurrency(vehicle.totalCout)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {vehicle.consommationMoyenne !== null ? (
                      <Badge 
                        className={
                          vehicle.consommationMoyenne <= 10 
                            ? "bg-green-500 hover:bg-green-600" 
                            : vehicle.consommationMoyenne <= 15 
                              ? "bg-yellow-500 hover:bg-yellow-600" 
                              : "bg-red-500 hover:bg-red-600"
                        }
                      >
                        {formatNumber(vehicle.consommationMoyenne)} L
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {vehicle.coutParKm !== null ? (
                      <span className="font-mono font-medium">
                        {formatNumber(vehicle.coutParKm, 2)} DH
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge className="bg-green-500 h-3 w-6 p-0" />
            <span>≤ 10 L/100km</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="bg-yellow-500 h-3 w-6 p-0" />
            <span>10-15 L/100km</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="bg-red-500 h-3 w-6 p-0" />
            <span>&gt; 15 L/100km</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
