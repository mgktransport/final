"use client"

import * as React from "react"
import { useState } from "react"
import {
  Fuel,
  Wrench,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  FileText,
  AlertTriangle,
  UserCheck,
  Car,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  totalChauffeurs: number
  chauffeursActifs: number
  totalVehicules: number
  vehiculesActifs: number
  totalClients: number
  clientsActifs: number
  facturesEnAttente: number
  facturesEnRetard: number
  alertesNonLues: number
  alertesHautePriorite: number
  entretiensAVenir: number
  documentsExpires: number
}

interface FinancialStats {
  chiffreAffaires: {
    moisCourant: number
    moisPrecedent: number
    anneeCourante: number
    total: number
    tendance: number
  }
  charges: {
    moisCourant: number
    moisPrecedent: number
    anneeCourante: number
    total: number
    tendance: number
    parCategorie: Array<{ categorie: string; montant: number }>
  }
  beneficeNet: {
    moisCourant: number
    moisPrecedent: number
    anneeCourante: number
    tendance: number
  }
  creances: {
    enAttente: { montant: number; count: number }
    enRetard: { montant: number; count: number }
    restantAPayer: number
  }
}

interface StatCardData {
  id: string
  title: string
  value: string | number
  subValue?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon: React.ElementType
  iconBgColor: string
}

interface StatCardProps {
  data: StatCardData
  isLoading?: boolean
}

function StatCard({ data, isLoading }: StatCardProps) {
  const Icon = data.icon
  const TrendIcon = data.trend?.isPositive ? ArrowUpRight : ArrowDownRight

  if (isLoading) {
    return (
      <div className="stat-card mgk-card-hover">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    )
  }

  return (
    <div className="stat-card mgk-card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {data.title}
          </p>
          <p className="text-2xl font-bold text-foreground">{data.value}</p>
          {data.subValue && (
            <p className="text-xs text-muted-foreground mt-1">{data.subValue}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm",
            data.iconBgColor
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {data.trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              data.trend.isPositive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(data.trend.value).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">
            vs. mois précédent
          </span>
        </div>
      )}
    </div>
  )
}

// Composant pour les cartes financières avec style spécial
interface FinancialCardProps {
  title: string
  value: string
  subValue?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon: React.ElementType
  iconBgColor: string
  valueColor?: string
  isLoading?: boolean
}

function FinancialCard({ title, value, subValue, trend, icon: Icon, iconBgColor, valueColor, isLoading }: FinancialCardProps) {
  const TrendIcon = trend?.isPositive ? ArrowUpRight : ArrowDownRight

  if (isLoading) {
    return (
      <div className="stat-card mgk-card-hover border-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-14 w-14 rounded-xl" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    )
  }

  return (
    <div className="stat-card mgk-card-hover border-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <p className={cn("text-3xl font-bold", valueColor || "text-foreground")}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl shadow-md",
            iconBgColor
          )}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.isPositive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">
            vs. mois précédent
          </span>
        </div>
      )}
    </div>
  )
}

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fuelStats, setFuelStats] = useState({ total: 0, count: 0 })

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch dashboard stats
        const response = await fetch('/api/dashboard/stats')
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }

        // Fetch financial stats
        const financialResponse = await fetch('/api/dashboard/financial')
        const financialData = await financialResponse.json()
        if (financialData.success) {
          setFinancialStats(financialData.data)
        }

        // Fetch fuel stats
        const fuelResponse = await fetch('/api/stats/carburant')
        const fuelData = await fuelResponse.json()
        if (fuelData.success) {
          setFuelStats({
            total: fuelData.data?.totalMois || 0,
            count: fuelData.data?.countMois || 0,
          })
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + ' DH'
  }

  // Cartes financières principales
  const financialCards: FinancialCardProps[] = financialStats ? [
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(financialStats.chiffreAffaires.moisCourant),
      subValue: `Année: ${formatCurrency(financialStats.chiffreAffaires.anneeCourante)}`,
      trend: {
        value: financialStats.chiffreAffaires.tendance,
        isPositive: financialStats.chiffreAffaires.tendance >= 0,
      },
      icon: DollarSign,
      iconBgColor: "bg-emerald-600",
      valueColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Total des charges",
      value: formatCurrency(financialStats.charges.moisCourant),
      subValue: `Année: ${formatCurrency(financialStats.charges.anneeCourante)}`,
      trend: {
        value: financialStats.charges.tendance,
        isPositive: financialStats.charges.tendance <= 0, // Pour les charges, une baisse est positive
      },
      icon: Wallet,
      iconBgColor: "bg-orange-500",
      valueColor: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Bénéfice net",
      value: formatCurrency(financialStats.beneficeNet.moisCourant),
      subValue: `Année: ${formatCurrency(financialStats.beneficeNet.anneeCourante)}`,
      trend: {
        value: financialStats.beneficeNet.tendance,
        isPositive: financialStats.beneficeNet.tendance >= 0,
      },
      icon: PiggyBank,
      iconBgColor: financialStats.beneficeNet.moisCourant >= 0 ? "bg-[#0066cc]" : "bg-red-500",
      valueColor: financialStats.beneficeNet.moisCourant >= 0 ? "text-[#0066cc] dark:text-[#4d9fff]" : "text-red-600 dark:text-red-400",
    },
  ] : []

  // Generate stats based on real data
  const statsData: StatCardData[] = stats ? [
    {
      id: "chauffeurs",
      title: "Chauffeurs actifs",
      value: stats.chauffeursActifs,
      subValue: `sur ${stats.totalChauffeurs} total`,
      icon: UserCheck,
      iconBgColor: "bg-[#0066cc]",
    },
    {
      id: "vehicules",
      title: "Véhicules actifs",
      value: stats.vehiculesActifs,
      subValue: `sur ${stats.totalVehicules} total`,
      icon: Truck,
      iconBgColor: "bg-[#003d7a]",
    },
    {
      id: "clients",
      title: "Clients actifs",
      value: stats.clientsActifs,
      subValue: `sur ${stats.totalClients} total`,
      icon: Users,
      iconBgColor: "bg-emerald-600",
    },
    {
      id: "fuel",
      title: "Dépenses carburant (mois)",
      value: formatCurrency(fuelStats.total),
      subValue: `${fuelStats.count} pleins ce mois`,
      icon: Fuel,
      iconBgColor: "bg-orange-500",
    },
    {
      id: "factures",
      title: "Factures en attente",
      value: stats.facturesEnAttente + stats.facturesEnRetard,
      subValue: stats.facturesEnRetard > 0 ? `${stats.facturesEnRetard} en retard` : undefined,
      icon: FileText,
      iconBgColor: "bg-amber-600",
    },
    {
      id: "alerts",
      title: "Alertes actives",
      value: stats.alertesNonLues,
      subValue: stats.alertesHautePriorite > 0 ? `${stats.alertesHautePriorite} haute priorité` : undefined,
      icon: AlertTriangle,
      iconBgColor: "bg-red-500",
    },
  ] : []

  return (
    <div className="space-y-6">
      {/* Section Finances principales */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[#0066cc]" />
          Situation Financière
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <FinancialCard
                  key={i}
                  title=""
                  value=""
                  icon={DollarSign}
                  iconBgColor=""
                  isLoading
                />
              ))}
            </>
          ) : (
            financialCards.map((card, index) => (
              <FinancialCard key={index} {...card} />
            ))
          )}
        </div>
      </div>

      {/* Section Créances */}
      {financialStats && !isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="stat-card mgk-card-hover">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Créances en attente
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(financialStats.creances.enAttente.montant)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {financialStats.creances.enAttente.count} facture(s)
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
          
          <div className="stat-card mgk-card-hover">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Créances en retard
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(financialStats.creances.enRetard.montant)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {financialStats.creances.enRetard.count} facture(s)
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="stat-card mgk-card-hover">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Restant à percevoir
                </p>
                <p className="text-2xl font-bold text-[#0066cc] dark:text-[#4d9fff]">
                  {formatCurrency(financialStats.creances.restantAPayer)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total créances - paiements reçus
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0066cc]/10">
                <DollarSign className="h-6 w-6 text-[#0066cc]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Statistiques opérationnelles */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#0066cc]" />
          Statistiques Opérationnelles
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <StatCard key={i} data={{ id: String(i), title: '', value: '', icon: Truck, iconBgColor: '' }} isLoading />
              ))}
            </>
          ) : (
            statsData.map((stat) => (
              <StatCard key={stat.id} data={stat} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
