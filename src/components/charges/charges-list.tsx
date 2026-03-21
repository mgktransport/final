"use client"

import * as React from "react"
import { Plus, CreditCard, Building2, Truck, Search, RefreshCw, Trash2, Pencil, Eye, Sparkles, Lock, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/format"
import { useVehicules } from "@/hooks/use-queries"
import { ChargeDetails } from "./charge-details"

// Types
type TypeCharge = 'VEHICULE' | 'SOCIETE'
type SourceCharge = 'SALAIRE' | 'PLEIN_CARBURANT' | 'ENTRETIEN' | 'ACHAT_VEHICULE' | 'ECHEANCE_CREDIT' | 'MANUEL'

// Interface pour les catégories (auto + personnalisées)
interface CategorieCharge {
  id: string
  code: string
  nom: string
  type: TypeCharge
  description?: string | null
  actif: boolean
  automatique: boolean
}

// Labels
const TYPE_CHARGE_LABELS: Record<TypeCharge, string> = {
  VEHICULE: 'Véhicule',
  SOCIETE: 'Société',
}

const SOURCE_LABELS: Record<SourceCharge, string> = {
  SALAIRE: 'Salaire',
  PLEIN_CARBURANT: 'Plein carburant',
  ENTRETIEN: 'Entretien',
  ACHAT_VEHICULE: 'Achat véhicule',
  ECHEANCE_CREDIT: 'Échéance crédit',
  MANUEL: 'Manuel',
}

interface Charge {
  id: string
  type: TypeCharge
  categorie: string
  categorieLabel?: string  // Ajouté par l'API
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
  notes?: string | null
}

interface ChargesListProps {
  onAdd: () => void
  onEdit: (charge: Charge) => void
  onDelete: (id: string) => void
  onRefresh: () => void
  filters: {
    type: string
    categorie: string
    automatique: string
    annee: string
    mois: string
    vehiculeId: string
    search: string
  }
  setFilters: React.Dispatch<React.SetStateAction<ChargesListProps['filters']>>
  charges: Charge[]
  isLoading: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  setPagination: React.Dispatch<React.SetStateAction<ChargesListProps['pagination']>>
}

// Mois options
const MOIS_OPTIONS = [
  { value: '', label: 'Tous les mois' },
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
]

// Années (année en cours et 4 années précédentes)
const ANNEE_EN_COURS = new Date().getFullYear()
const ANNEES_OPTIONS = [
  { value: '', label: 'Toutes les années' },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: (ANNEE_EN_COURS - i).toString(),
    label: (ANNEE_EN_COURS - i).toString(),
  })),
]

export function ChargesList({
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  filters,
  setFilters,
  charges,
  isLoading,
  pagination,
  setPagination,
}: ChargesListProps) {
  const { toast } = useToast()
  const { data: vehiculesData } = useVehicules({ page: 1, pageSize: 100 })
  const vehicules = vehiculesData?.data || []

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [chargeToDelete, setChargeToDelete] = React.useState<Charge | null>(null)
  const [showFilters, setShowFilters] = React.useState(true)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [selectedChargeId, setSelectedChargeId] = React.useState<string | null>(null)
  
  // Charger les catégories depuis l'API
  const [categories, setCategories] = React.useState<CategorieCharge[]>([])
  const [loadingCategories, setLoadingCategories] = React.useState(true)
  
  // Créer un map code -> nom pour l'affichage
  const categorieLabels = React.useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach(cat => {
      map[cat.code] = cat.nom
    })
    return map
  }, [categories])

  // Charger les catégories au montage
  React.useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const response = await fetch('/api/categories-charges')
        const result = await response.json()
        if (result.success) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error("Erreur chargement catégories:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  const handleViewDetails = (chargeId: string) => {
    setSelectedChargeId(chargeId)
    setDetailsDialogOpen(true)
  }

  const handleDeleteClick = (charge: Charge) => {
    if (charge.automatique) {
      toast({
        variant: "destructive",
        title: "Action non autorisée",
        description: "Les charges automatiques ne peuvent pas être supprimées",
      })
      return
    }
    setChargeToDelete(charge)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!chargeToDelete) return
    await onDelete(chargeToDelete.id)
    setDeleteDialogOpen(false)
    setChargeToDelete(null)
  }

  // Filtrer les catégories selon le type sélectionné
  const categoriesOptions = React.useMemo(() => {
    const all = [{ value: '', label: 'Toutes catégories' }]
    
    let filteredCats = categories
    if (filters.type) {
      filteredCats = categories.filter(cat => cat.type === filters.type)
    }
    
    return [
      ...all,
      ...filteredCats.map(cat => ({
        value: cat.code,
        label: cat.nom,
      })),
    ]
  }, [filters.type, categories])

  // Fonction pour obtenir le nom de la catégorie
  // Utilise d'abord le label de l'API, puis le map local
  const getCategorieLabel = (charge: Charge) => {
    if (charge.categorieLabel) return charge.categorieLabel
    return categorieLabels[charge.categorie] || charge.categorie || 'Non définie'
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      {showFilters && (
        <div className="bg-white dark:bg-card rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            {/* Type */}
            <Select 
              value={filters.type || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? '' : value, categorie: '' })}
            >
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="VEHICULE">Véhicule</SelectItem>
                <SelectItem value="SOCIETE">Société</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Catégorie */}
            <Select 
              value={filters.categorie || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, categorie: value === 'all' ? '' : value })}
              disabled={loadingCategories}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder={loadingCategories ? "Chargement..." : "Catégorie"} />
              </SelectTrigger>
              <SelectContent>
                {categoriesOptions.map((cat) => (
                  <SelectItem key={cat.value || 'all'} value={cat.value || 'all'}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Année */}
            <Select 
              value={filters.annee || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, annee: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {ANNEES_OPTIONS.map((annee) => (
                  <SelectItem key={annee.value || 'all'} value={annee.value || 'all'}>
                    {annee.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Mois */}
            <Select 
              value={filters.mois || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, mois: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {MOIS_OPTIONS.map((mois) => (
                  <SelectItem key={mois.value || 'all'} value={mois.value || 'all'}>
                    {mois.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Source (automatique/manuel) */}
            <Select 
              value={filters.automatique || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, automatique: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="true">Automatiques</SelectItem>
                <SelectItem value="false">Manuelles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({
              type: '',
              categorie: '',
              automatique: '',
              annee: new Date().getFullYear().toString(),
              mois: (new Date().getMonth() + 1).toString(),
              vehiculeId: '',
              search: '',
            })}
          >
            Réinitialiser
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={onAdd} className="bg-[#0066cc] hover:bg-[#0052a3]">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une charge
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-card rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : charges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Aucune charge trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              charges.map((charge) => (
                <TableRow 
                  key={charge.id}
                  className={charge.automatique ? "bg-purple-50/50 dark:bg-purple-950/20" : ""}
                >
                  <TableCell>
                    {charge.type === 'VEHICULE' ? (
                      <Truck className="h-4 w-4 text-[#0066cc]" />
                    ) : (
                      <Building2 className="h-4 w-4 text-[#ff6600]" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{charge.description}</p>
                        {charge.automatique && (
                          <Lock className="h-3 w-3 text-purple-500" title="Charge automatique" />
                        )}
                      </div>
                      {charge.vehicule && (
                        <p className="text-xs text-muted-foreground">
                          {charge.vehicule.immatriculation}
                        </p>
                      )}
                      {charge.fournisseur && (
                        <p className="text-xs text-muted-foreground">
                          {charge.fournisseur}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getCategorieLabel(charge)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={charge.type === 'VEHICULE' ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}
                    >
                      {TYPE_CHARGE_LABELS[charge.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(charge.montant)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(charge.dateCharge)}
                  </TableCell>
                  <TableCell>
                    {charge.automatique ? (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {charge.sourceType ? SOURCE_LABELS[charge.sourceType] : 'Auto'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-800">
                        Manuel
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(charge.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        {!charge.automatique && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(charge)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(charge)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Affichage de {((pagination.page - 1) * 20) + 1} à {Math.min(pagination.page * 20, pagination.total)} sur {pagination.total} charges
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <span className="text-sm">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette charge ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette charge ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Charge details dialog */}
      <ChargeDetails 
        open={detailsDialogOpen} 
        onOpenChange={setDetailsDialogOpen} 
        chargeId={selectedChargeId} 
      />
    </div>
  )
}
