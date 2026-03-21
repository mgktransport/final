"use client"

import * as React from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { TopClients } from "@/components/dashboard/top-clients"
import { AlertsWidget } from "@/components/dashboard/alerts-widget"
import { FuelStats } from "@/components/dashboard/fuel-stats"
import { EntretienStats } from "@/components/dashboard/entretien-stats"
import { VehicleProfitChart } from "@/components/dashboard/vehicle-profit-chart"
import { ExpenseDistributionChart } from "@/components/dashboard/expense-distribution-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// Composant pour les prochains événements
function UpcomingEvents() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#0066cc]" />
          Prochains événements
        </CardTitle>
        <CardDescription>
          Entretiens et échéances à venir
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0066cc]/10">
              <Calendar className="h-5 w-5 text-[#0066cc]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Consultez le module Alertes</p>
              <p className="text-xs text-muted-foreground">Pour voir tous les événements à venir</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre espace de gestion MGK Transport. Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Statistiques */}
      <StatsCards />

      {/* Statistiques Carburant */}
      <FuelStats />

      {/* Statistiques Entretien */}
      <EntretienStats />

      {/* Onglets pour les graphiques */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analytics">Analytiques</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Revenus vs Dépenses - pleine largeur */}
          <RevenueChart />
          
          <div className="grid gap-4 lg:grid-cols-2">
            <TopClients />
            <AlertsWidget />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <VehicleProfitChart />
            <ExpenseDistributionChart />
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleProfitChart />
            <ExpenseDistributionChart />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TopClients />
            <AlertsWidget />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
