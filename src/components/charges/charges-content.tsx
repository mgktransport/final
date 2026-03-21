"use client"

import * as React from "react"
import { CreditCard, RefreshCw, Sparkles, Hand } from "lucide-react"
import { ChargesList } from "./charges-list"
import { ChargeForm } from "./charge-form"
import { useToast } from "@/hooks/use-toast"

// Types basés sur le nouveau modèle Prisma simplifié
type TypeCharge = 'VEHICULE' | 'SOCIETE'
type CategorieCharge =
  | 'CARBURANT'
  | 'ASSURANCE_VEHICULE'
  | 'ENTRETIEN_VEHICULE'
  | 'REPARATION'
  | 'VISITE_TECHNIQUE'
  | 'PNEUS'
  | 'PEAGE'
  | 'STATIONNEMENT'
  | 'AMENDE'
  | 'ACHAT_VEHICULE'
  | 'LOYER'
  | 'ELECTRICITE'
  | 'EAU'
  | 'TELEPHONE_INTERNET'
  | 'SALAIRES'
  | 'CHARGES_SOCIALES'
  | 'ASSURANCE_SOCIETE'
  | 'COMPTABILITE'
  | 'FOURNITURES_BUREAU'
  | 'PUBLICITE'
  | 'FORMATION'
  | 'AUTRE'

type SourceCharge = 'SALAIRE' | 'PLEIN_CARBURANT' | 'ENTRETIEN' | 'ACHAT_VEHICULE' | 'ECHEANCE_CREDIT' | 'MANUEL'

interface Charge {
  id: string
  type: TypeCharge
  categorie: CategorieCharge
  description: string
  montant: number
  dateCharge: Date | string
  vehiculeId?: string | null
  vehicule?: { id: string; immatriculation: string; marque: string; modele: string } | null
  automatique: boolean
  sourceType?: SourceCharge | null
  sourceId?: string | null
  chauffeurId?: string | null
  fournisseur?: string | null
  numeroFacture?: string | null
  fichier?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export function ChargesContent() {
  const { toast } = useToast()
  const [charges, setCharges] = React.useState<Charge[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingCharge, setEditingCharge] = React.useState<Charge | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [totaux, setTotaux] = React.useState({
    montant: 0,
    count: 0,
  })
  const [filters, setFilters] = React.useState({
    type: '',
    categorie: '',
    automatique: '',
    annee: new Date().getFullYear().toString(),
    mois: (new Date().getMonth() + 1).toString(),
    vehiculeId: '',
    search: '',
  })

  // Fetch charges
  const fetchCharges = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.categorie) params.set('categorie', filters.categorie)
      if (filters.automatique) params.set('automatique', filters.automatique)
      if (filters.annee) params.set('annee', filters.annee)
      if (filters.mois) params.set('mois', filters.mois)
      if (filters.vehiculeId) params.set('vehiculeId', filters.vehiculeId)
      if (filters.search) params.set('search', filters.search)
      params.set('page', pagination.page.toString())
      params.set('pageSize', pagination.pageSize.toString())

      const response = await fetch(`/api/charges?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setCharges(data.data)
        setPagination(prev => ({
          ...prev,
          ...data.pagination,
        }))
        if (data.totaux) {
          setTotaux(data.totaux)
        }
      }
    } catch (error) {
      console.error("Erreur récupération charges:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les charges",
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.pageSize, toast])

  React.useEffect(() => {
    fetchCharges()
  }, [fetchCharges, refreshKey])

  const handleAdd = () => {
    setEditingCharge(null)
    setFormOpen(true)
  }

  const handleEdit = (charge: Charge) => {
    // Les charges automatiques ne peuvent pas être modifiées
    if (charge.automatique) {
      toast({
        variant: "destructive",
        title: "Action non autorisée",
        description: "Les charges automatiques ne peuvent pas être modifiées",
      })
      return
    }
    setEditingCharge(charge)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    const charge = charges.find(c => c.id === id)
    
    // Les charges automatiques ne peuvent pas être supprimées
    if (charge?.automatique) {
      toast({
        variant: "destructive",
        title: "Action non autorisée",
        description: "Les charges automatiques ne peuvent pas être supprimées",
      })
      return
    }

    try {
      const response = await fetch(`/api/charges/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Succès",
          description: "Charge supprimée avec succès",
        })
        setRefreshKey(prev => prev + 1)
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || "Erreur lors de la suppression",
        })
      }
    } catch (error) {
      console.error("Erreur suppression:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la suppression de la charge",
      })
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleFormSuccess = () => {
    setFormOpen(true)
    setFormOpen(false)
    setRefreshKey(prev => prev + 1)
  }

  // Calculer les stats
  const stats = React.useMemo(() => {
    const automatiques = charges.filter(c => c.automatique)
    const manuelles = charges.filter(c => !c.automatique)
    const vehicules = charges.filter(c => c.type === 'VEHICULE')
    const societe = charges.filter(c => c.type === 'SOCIETE')
    
    return {
      total: charges.length,
      totalMontant: totaux.montant,
      automatiques: automatiques.length,
      manuelles: manuelles.length,
      vehicules: vehicules.length,
      societe: societe.length,
    }
  }, [charges, totaux.montant])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#0066cc]" />
            Gestion des Charges
          </h1>
          <p className="text-muted-foreground">
            Gérez les charges véhicules et société
          </p>
        </div>
      </div>

      {/* Info sur les charges automatiques */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Charges automatiques</p>
            <p>
              Certaines charges sont générées automatiquement : 
              <strong> Salaires, Charges sociales</strong> (lors du paiement d&apos;un salaire), 
              <strong> Carburant</strong> (lors d&apos;un plein), 
              <strong> Entretien</strong> (lors d&apos;un entretien véhicule),
              <strong> Achat véhicule</strong> (lors du paiement d&apos;une échéance ou achat comptant).
            </p>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              Ces charges sont en lecture seule et ne peuvent pas être modifiées manuellement.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-card rounded-lg shadow p-4 text-center">
          <CreditCard className="h-5 w-5 text-[#0066cc] mx-auto mb-2" />
          <p className="text-xl font-bold">{stats.totalMontant.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="bg-white dark:bg-card rounded-lg shadow p-4 text-center">
          <Sparkles className="h-5 w-5 text-purple-500 mx-auto mb-2" />
          <p className="text-xl font-bold">{stats.automatiques}</p>
          <p className="text-sm text-muted-foreground">Automatiques</p>
        </div>
        <div className="bg-white dark:bg-card rounded-lg shadow p-4 text-center">
          <Hand className="h-5 w-5 text-green-500 mx-auto mb-2" />
          <p className="text-xl font-bold">{stats.manuelles}</p>
          <p className="text-sm text-muted-foreground">Manuelles</p>
        </div>
        <div className="bg-white dark:bg-card rounded-lg shadow p-4 text-center">
          <CreditCard className="h-5 w-5 text-[#0066cc] mx-auto mb-2" />
          <p className="text-xl font-bold">{stats.vehicules}</p>
          <p className="text-sm text-muted-foreground">Véhicules</p>
        </div>
        <div className="bg-white dark:bg-card rounded-lg shadow p-4 text-center">
          <CreditCard className="h-5 w-5 text-[#ff6600] mx-auto mb-2" />
          <p className="text-xl font-bold">{stats.societe}</p>
          <p className="text-sm text-muted-foreground">Société</p>
        </div>
      </div>

      {/* Charges List */}
      <ChargesList
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
        filters={filters}
        setFilters={setFilters}
        charges={charges}
        isLoading={isLoading}
        pagination={pagination}
        setPagination={setPagination}
      />

      {/* Add/Edit Form */}
      <ChargeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        editingCharge={editingCharge}
      />
    </div>
  )
}
