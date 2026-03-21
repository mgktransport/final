"use client"

import * as React from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { MainLayout } from "@/components/layout/main-layout"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { ChauffeursContent } from "@/components/chauffeurs/chauffeurs-content"
import { VehiculesContent } from "@/components/vehicules/vehicules-content"
import { ClientsContent } from "@/components/clients/clients-content"
import { FacturesContent } from "@/components/factures/factures-content"
import { AlertesContent } from "@/components/alertes/alertes-content"
import { ParametresContent } from "@/components/parametres/parametres-content"
import { ChargesContent } from "@/components/charges/charges-content"
import { ExploitationContent } from "@/components/exploitation/exploitation-content"
import { LoginPage } from "@/components/auth/login-page"
import { ChauffeurDashboard } from "@/components/chauffeur/chauffeur-dashboard"
import { Loader2, Truck } from "lucide-react"

// Module types
type Module = "dashboard" | "chauffeurs" | "vehicules" | "clients" | "exploitation" | "facturation" | "alertes" | "parametres" | "charges"

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [mounted, setMounted] = React.useState(false)
  const [currentModule, setCurrentModule] = React.useState<Module>("dashboard")

  // Handle hydration
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for navigation events from sidebar
  React.useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      setCurrentModule(event.detail as Module)
    }
    
    window.addEventListener("navigate", handleNavigate as EventListener)
    return () => {
      window.removeEventListener("navigate", handleNavigate as EventListener)
    }
  }, [])

  // Get the path for the current module
  const getActivePath = () => {
    const paths: Record<Module, string> = {
      dashboard: "/",
      chauffeurs: "/chauffeurs",
      vehicules: "/vehicules",
      clients: "/clients",
      exploitation: "/exploitation",
      facturation: "/facturation",
      alertes: "/alertes",
      parametres: "/parametres",
      charges: "/charges",
    }
    return paths[currentModule]
  }

  // Render the current module content
  const renderContent = () => {
    switch (currentModule) {
      case "dashboard":
        return <DashboardContent />
      case "chauffeurs":
        return <ChauffeursContent />
      case "vehicules":
        return <VehiculesContent />
      case "clients":
        return <ClientsContent />
      case "exploitation":
        return <ExploitationContent />
      case "facturation":
        return <FacturesContent />
      case "alertes":
        return <AlertesContent />
      case "parametres":
        return <ParametresContent />
      case "charges":
        return <ChargesContent />
      default:
        return <DashboardContent />
    }
  }

  // Loading state before hydration
  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0066cc] to-[#003d7a]">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Chauffeur role - show dedicated interface
  if (user?.role === "CHAUFFEUR") {
    return <ChauffeurDashboard />
  }

  // Authenticated - show app
  return (
    <MainLayout activePath={getActivePath()}>
      {renderContent()}
    </MainLayout>
  )
}

export default function AppPage() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
