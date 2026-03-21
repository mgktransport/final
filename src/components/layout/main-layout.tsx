"use client"

import * as React from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  Truck,
  Building2,
  FileText,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  User,
  CreditCard,
  Route,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { LiveDateTime } from "@/components/ui/live-datetime"
import { useAlertes, useCheckDocumentAlerts } from "@/hooks/use-queries"
import { ProfileDialog } from "@/components/auth/profile-dialog"

// Navigation items
const navigationItems = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { id: "chauffeurs", title: "Chauffeurs", icon: Users },
  { id: "vehicules", title: "Véhicules", icon: Truck },
  { id: "clients", title: "Clients", icon: Building2 },
  { id: "exploitation", title: "Exploitation", icon: Route, color: "orange" },
  { id: "charges", title: "Charges", icon: CreditCard },
  { id: "facturation", title: "Facturation", icon: FileText },
  { id: "alertes", title: "Alertes", icon: Bell },
  { id: "parametres", title: "Paramètres", icon: Settings },
]

// Module titles for header
const moduleTitles: Record<string, string> = {
  dashboard: "Tableau de bord",
  chauffeurs: "Gestion des Chauffeurs",
  vehicules: "Gestion des Véhicules",
  clients: "Gestion des Clients",
  exploitation: "Exploitation des Services",
  charges: "Gestion des Charges",
  facturation: "Facturation",
  alertes: "Alertes",
  parametres: "Paramètres",
}

interface MainLayoutProps {
  children: React.ReactNode
  activePath?: string
}

export function MainLayout({ children, activePath = "/" }: MainLayoutProps) {
  const [mounted, setMounted] = React.useState(false)
  const { user, logout } = useAuth()
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)

  // Fetch alertes for notification badge
  const { data: alertes } = useAlertes({ lu: false })
  
  // Check alerts mutation
  const checkAlertsMutation = useCheckDocumentAlerts()

  // Check alerts on mount (application startup)
  React.useEffect(() => {
    if (mounted) {
      checkAlertsMutation.mutate()
    }
  }, [mounted])

  // Handle hydration
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Determine active module from activePath
  const getActiveModule = () => {
    if (activePath === "/" || activePath === "") return "dashboard"
    const moduleName = activePath.replace("/", "")
    return moduleName || "dashboard"
  }

  const activeModule = getActiveModule()

  // Count non-lues and non-resolues alertes
  const alertCount = React.useMemo(() => {
    if (!alertes) return 0
    return alertes.filter(a => !a.lu && !a.resolute).length
  }, [alertes])

  // Handle navigation click
  const handleNavigate = (moduleId: string) => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: moduleId }))
  }

  // Loading state before hydration
  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="border-b border-white/20">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <button onClick={() => handleNavigate("dashboard")}>
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm p-0.5">
                      <Image
                        src="/logo-mgk.png"
                        alt="MGK Transport"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-bold text-lg text-white">
                        MGK Transport
                      </span>
                      <span className="text-xs text-white/70">
                        Gestion du Transport
                      </span>
                    </div>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeModule === item.id}
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10",
                        activeModule === item.id && item.color === "orange" &&
                          "bg-[#ff6600]/30 text-[#ff6600] font-medium hover:bg-[#ff6600]/40",
                        activeModule === item.id && item.color !== "orange" &&
                          "bg-white/20 text-white font-medium"
                      )}
                    >
                      <button
                        onClick={() => handleNavigate(item.id)}
                        className="flex items-center gap-2 w-full"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/20">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-white/20 text-white"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#0066cc] text-white text-sm">
                        {user ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase() : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-white">
                        {user ? `${user.prenom} ${user.nom}` : 'Administrateur'}
                      </span>
                      <span className="truncate text-xs text-white/60">
                        {user?.email || 'admin@mgktransport.com'}
                      </span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-white/70" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setProfileDialogOpen(true)}>
                    <User className="h-4 w-4" />
                    <span>Mon profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-destructive cursor-pointer" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">
              {moduleTitles[activeModule] || "Tableau de bord"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LiveDateTime />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
              onClick={() => handleNavigate("alertes")}
            >
              <Bell className="h-5 w-5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ff6600] text-[10px] font-bold text-white flex items-center justify-center">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>

        <footer className="sticky bottom-0 border-t bg-background py-3 px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-white p-0.5">
                <Image
                  src="/logo-mgk.png"
                  alt="MGK Transport"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
              <span>&copy; {new Date().getFullYear()} MGK Transport. Tous droits réservés.</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-[#0066cc] transition-colors cursor-pointer">
                Aide
              </span>
              <span className="hover:text-[#0066cc] transition-colors cursor-pointer">
                Confidentialité
              </span>
              <span className="hover:text-[#0066cc] transition-colors cursor-pointer">
                Conditions
              </span>
            </div>
          </div>
        </footer>
      </SidebarInset>

      {/* Profile Dialog */}
      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </SidebarProvider>
  )
}
