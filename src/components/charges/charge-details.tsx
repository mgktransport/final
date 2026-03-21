"use client"

import * as React from "react"
import { CreditCard, Truck, Building2, Sparkles, Lock, Calendar, FileText, Hash, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/format"
import { useCharge } from "@/hooks/use-queries"

// Types
type TypeCharge = 'VEHICULE' | 'SOCIETE'
type SourceCharge = 'SALAIRE' | 'PLEIN_CARBURANT' | 'ENTRETIEN' | 'ACHAT_VEHICULE' | 'ECHEANCE_CREDIT' | 'MANUEL'

// Interface pour les catégories
interface CategorieCharge {
  id: string
  code: string
  nom: string
  type: TypeCharge
  automatique: boolean
}

// Labels
const TYPE_CHARGE_LABELS: Record<TypeCharge, string> = {
  VEHICULE: 'Véhicule',
  SOCIETE: 'Société',
}

const SOURCE_LABELS: Record<SourceCharge, string> = {
  SALAIRE: 'Salaire payé',
  PLEIN_CARBURANT: 'Plein carburant',
  ENTRETIEN: 'Entretien véhicule',
  ACHAT_VEHICULE: 'Achat véhicule',
  ECHEANCE_CREDIT: 'Échéance crédit',
  MANUEL: 'Saisie manuelle',
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
  fournisseur?: string | null
  numeroFacture?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

interface ChargeDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chargeId: string | null
}

export function ChargeDetails({ open, onOpenChange, chargeId }: ChargeDetailsProps) {
  const { data: charge, isLoading, error, refetch } = useCharge(chargeId || "")
  
  // Charger les catégories depuis l'API pour le fallback
  const [categories, setCategories] = React.useState<CategorieCharge[]>([])
  
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
      try {
        const response = await fetch('/api/categories-charges')
        const result = await response.json()
        if (result.success) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error("Erreur chargement catégories:", error)
      }
    }
    fetchCategories()
  }, [])

  // Refetch when dialog opens
  React.useEffect(() => {
    if (open && chargeId) {
      refetch()
    }
  }, [open, chargeId, refetch])

  // Fonction pour obtenir le nom de la catégorie
  // Utilise d'abord le label de l'API, puis le map local
  const getCategorieLabel = (chargeData: Charge | null) => {
    if (!chargeData) return 'Non définie'
    if (chargeData.categorieLabel) return chargeData.categorieLabel
    return categorieLabels[chargeData.categorie] || chargeData.categorie || 'Non définie'
  }

  if (!chargeId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#0066cc]" />
            Détails de la charge
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur cette charge
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066cc]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Erreur lors du chargement des détails
          </div>
        ) : charge ? (
          <div className="space-y-4">
            {/* En-tête avec badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {charge.type === 'VEHICULE' ? (
                  <Truck className="h-5 w-5 text-[#0066cc]" />
                ) : (
                  <Building2 className="h-5 w-5 text-[#ff6600]" />
                )}
                <Badge 
                  variant="secondary" 
                  className={charge.type === 'VEHICULE' ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}
                >
                  {TYPE_CHARGE_LABELS[charge.type as TypeCharge]}
                </Badge>
                {charge.automatique && (
                  <Badge className="bg-purple-100 text-purple-800">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Automatique
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold">{charge.description}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {getCategorieLabel(charge)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Montant et Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="text-xl font-bold text-[#0066cc]">
                  {formatCurrency(charge.montant)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(charge.dateCharge)}
                </p>
              </div>
            </div>

            {/* Source */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Source</p>
              <div className="flex items-center gap-2">
                {charge.automatique ? (
                  <>
                    <Lock className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">
                      {charge.sourceType ? SOURCE_LABELS[charge.sourceType as SourceCharge] : 'Généré automatiquement'}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Saisie manuelle</span>
                  </>
                )}
              </div>
            </div>

            {/* Véhicule (si applicable) */}
            {charge.vehicule && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-1">Véhicule associé</p>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#0066cc]" />
                  <span className="font-medium">
                    {charge.vehicule.immatriculation} - {charge.vehicule.marque} {charge.vehicule.modele}
                  </span>
                </div>
              </div>
            )}

            {/* Fournisseur et Facture */}
            {(charge.fournisseur || charge.numeroFacture) && (
              <div className="grid grid-cols-2 gap-4">
                {charge.fournisseur && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Fournisseur
                    </p>
                    <p className="font-medium">{charge.fournisseur}</p>
                  </div>
                )}
                {charge.numeroFacture && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      N° Facture
                    </p>
                    <p className="font-medium">{charge.numeroFacture}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {charge.notes && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3" />
                  Notes
                </p>
                <p className="text-sm bg-muted/50 rounded p-2">{charge.notes}</p>
              </div>
            )}

            {/* Métadonnées */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>Créé le {formatDate(charge.createdAt)}</p>
              {charge.updatedAt !== charge.createdAt && (
                <p>Modifié le {formatDate(charge.updatedAt)}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Charge non trouvée
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
