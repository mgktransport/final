"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Truck } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

interface VehicleData {
  id: string
  name: string
  marque: string
  modele: string
  revenue: number
  costs: number
  profit: number
}

const chartConfig = {
  profit: {
    label: "Bénéfice",
    color: "#10b981",
  },
  costs: {
    label: "Coûts",
    color: "#ff6600",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
  return `${formatted} DH`
}

export function VehicleProfitChart() {
  const [data, setData] = useState<VehicleData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/charts')
        const result = await response.json()
        if (result.success) {
          setData(result.data.rentabiliteVehicules)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
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
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#0066cc]" />
            Rentabilité par véhicule
          </CardTitle>
          <CardDescription>
            Aucun véhicule actif avec des données
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Les données de rentabilité apparaîtront ici après facturation
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#0066cc]" />
          Rentabilité par véhicule
        </CardTitle>
        <CardDescription>
          Top 5 véhicules les plus rentables cette année
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="var(--border)"
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={80}
            />
            <ChartTooltipContent
              formatter={(value) => formatCurrency(value as number)}
            />
            <Bar
              dataKey="profit"
              fill="var(--color-profit)"
              radius={[0, 4, 4, 0]}
              maxBarSize={30}
            />
            <Bar
              dataKey="costs"
              fill="var(--color-costs)"
              radius={[0, 4, 4, 0]}
              maxBarSize={30}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
