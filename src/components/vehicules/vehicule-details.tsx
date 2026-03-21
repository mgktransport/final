"use client"

import * as React from "react"
import {
  Truck,
  Pencil,
  Trash2,
  User,
  Gauge,
  Users,
  Fuel,
  Wrench,
  FileText,
  Plus,
  AlertTriangle,
  Eye,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useVehicule, useDeleteVehicule, useDocumentsVehicule, useDeleteDocumentVehicule } from "@/hooks/use-queries"
import { formatCurrency, formatDate } from "@/lib/format"
import { EntretienForm } from "./entretien-form"
import { CarburantForm } from "./carburant-form"
import { DocumentVehiculeForm } from "./document-vehicule-form"
import { AchatVehiculeTab } from "./achat-vehicule-tab"
import { useToast } from "@/hooks/use-toast"
import { TypeDocumentVehicule } from "@/types"

// Helper function to get file URL (use API route for reliable access)
function getFileUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  // If the path starts with /uploads, convert to API route
  if (filePath.startsWith('/uploads/')) {
    return '/api/files/' + filePath.substring('/uploads/'.length);
  }
  return filePath;
}

// Predefined Document Types Labels
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  [TypeDocumentVehicule.ASSURANCE]: "Assurance",
  [TypeDocumentVehicule.VISITE_TECHNIQUE]: "Visite technique",
  [TypeDocumentVehicule.CARTE_GRISE]: "Carte grise",
}

// Fonction pour calculer la consommation moyenne (L/100km)
function calculerConsommationMoyenne(pleins: any[]): string {
  if (!pleins || pleins.length < 2) return "-"
  
  const pleinsWithKm = pleins.filter(p => p.kilometrage > 0)
  if (pleinsWithKm.length < 2) return "-"
  
  const sorted = [...pleinsWithKm].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const kmParcourus = sorted[sorted.length - 1].kilometrage - sorted[0].kilometrage
  const litresConsommes = sorted.slice(1).reduce((sum, p) => sum + p.quantite, 0)
  
  if (kmParcourus <= 0 || litresConsommes <= 0) return "-"
  
  const consommation = (litresConsommes / kmParcourus) * 100
  return consommation.toFixed(1)
}

// Fonction pour calculer le coût par km
function calculerCoutKm(pleins: any[], totalPrix: number): string {
  if (!pleins || pleins.length < 2) return "-"
  
  const pleinsWithKm = pleins.filter(p => p.kilometrage > 0)
  if (pleinsWithKm.length < 2) return "-"
  
  const sorted = [...pleinsWithKm].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const kmParcourus = sorted[sorted.length - 1].kilometrage - sorted[0].kilometrage
  
  if (kmParcourus <= 0 || totalPrix <= 0) return "-"
  
  const coutKm = totalPrix / kmParcourus
  return coutKm.toFixed(2)
}

interface VehiculeDetailsProps {
  vehiculeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (id: string) => void
  onRefresh?: () => void
}

export function VehiculeDetails({ vehiculeId, open, onOpenChange, onEdit, onRefresh }: VehiculeDetailsProps) {
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [entretienFormOpen, setEntretienFormOpen] = React.useState(false)
  const [carburantFormOpen, setCarburantFormOpen] = React.useState(false)
  const [documentFormOpen, setDocumentFormOpen] = React.useState(false)
  const [editingCarburantId, setEditingCarburantId] = React.useState<string | null>(null)
  const [deleteCarburantId, setDeleteCarburantId] = React.useState<string | null>(null)
  const [deleteCarburantDialogOpen, setDeleteCarburantDialogOpen] = React.useState(false)
  const [editingEntretienId, setEditingEntretienId] = React.useState<string | null>(null)
  const [deleteEntretienId, setDeleteEntretienId] = React.useState<string | null>(null)
  const [deleteEntretienDialogOpen, setDeleteEntretienDialogOpen] = React.useState(false)
  const [editingDocument, setEditingDocument] = React.useState<any>(null)
  const [deleteDocumentId, setDeleteDocumentId] = React.useState<string | null>(null)
  const [deleteDocumentDialogOpen, setDeleteDocumentDialogOpen] = React.useState(false)
  // Filtres carburant - par défaut année et mois en cours
  const [filtreAnnee, setFiltreAnnee] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return new Date().getFullYear().toString()
    }
    return "all"
  })
  const [filtreMois, setFiltreMois] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return (new Date().getMonth() + 1).toString()
    }
    return "all"
  })
  
  // Filtres entretien - par défaut année et mois en cours
  const [filtreEntretienAnnee, setFiltreEntretienAnnee] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return new Date().getFullYear().toString()
    }
    return "all"
  })
  const [filtreEntretienMois, setFiltreEntretienMois] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return (new Date().getMonth() + 1).toString()
    }
    return "all"
  })
  const [filtreEntretienType, setFiltreEntretienType] = React.useState<string>("all")
  
  const { data: vehicule, isLoading, refetch } = useVehicule(vehiculeId || "")
  const { data: documents = [], refetch: refetchDocuments } = useDocumentsVehicule(vehiculeId || "")
  const deleteVehicule = useDeleteVehicule()
  const deleteDocumentMutation = useDeleteDocumentVehicule()
  
  React.useEffect(() => {
    if (open && vehiculeId) {
      refetch()
      refetchDocuments()
    }
  }, [open, vehiculeId, refetch, refetchDocuments])

  const handleRefreshData = () => {
    refetch()
    refetchDocuments()
    onRefresh?.()
  }
  
  const handleDelete = async () => {
    if (!vehiculeId) return
    try {
      await deleteVehicule.mutateAsync(vehiculeId)
      setDeleteDialogOpen(false)
      onOpenChange(false)
      onRefresh?.()
    } catch (error) {
      console.error("Erreur suppression:", error)
    }
  }

  const handleEditCarburant = (id: string) => {
    setEditingCarburantId(id)
    setCarburantFormOpen(true)
  }

  const handleEditEntretien = (id: string) => {
    setEditingEntretienId(id)
    setEntretienFormOpen(true)
  }

  const handleEditDocument = (doc: any) => {
    setEditingDocument(doc)
    setDocumentFormOpen(true)
  }

  const handleDeleteEntretien = async () => {
    if (!deleteEntretienId) return
    try {
      const response = await fetch(`/api/entretiens/${deleteEntretienId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        handleRefreshData()
      }
    } catch (error) {
      console.error("Erreur suppression entretien:", error)
    } finally {
      setDeleteEntretienDialogOpen(false)
      setDeleteEntretienId(null)
    }
  }

  const handleDeleteCarburant = async () => {
    if (!deleteCarburantId) return
    try {
      const response = await fetch(`/api/carburant/${deleteCarburantId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        handleRefreshData()
      }
    } catch (error) {
      console.error("Erreur suppression carburant:", error)
    } finally {
      setDeleteCarburantDialogOpen(false)
      setDeleteCarburantId(null)
    }
  }

  const handleDeleteDocument = async () => {
    if (!deleteDocumentId || !vehiculeId) return
    try {
      await deleteDocumentMutation.mutateAsync({ id: deleteDocumentId, vehiculeId })
      toast({
        title: "Succès",
        description: "Document supprimé avec succès",
      })
      handleRefreshData()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du document",
        variant: "destructive",
      })
    } finally {
      setDeleteDocumentDialogOpen(false)
      setDeleteDocumentId(null)
    }
  }
  
  const getTypeEntretienLabel = (type: string) => {
    const labels: Record<string, string> = {
      VIDANGE: "Vidange",
      PNEUS: "Pneus",
      FREINS: "Freins",
      ASSURANCE_VEHICULE: "Assurance",
      VISITE_TECHNIQUE: "Visite technique",
      REPARATION: "Réparation",
    }
    return labels[type] || type
  }
  
  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPE_LABELS[type] || type
  }

  const getDocumentStatus = (dateExpiration: Date | string | null) => {
    if (!dateExpiration) {
      return { status: "unknown", label: "Non définie", color: "bg-gray-500", daysRemaining: null }
    }

    const expiration = new Date(dateExpiration)
    const now = new Date()
    const daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining < 0) {
      return { status: "expired", label: "Expiré", color: "bg-red-500", daysRemaining }
    }
    if (daysRemaining <= 7) {
      return { status: "critical", label: `${daysRemaining}j restant`, color: "bg-orange-500", daysRemaining }
    }
    if (daysRemaining <= 30) {
      return { status: "warning", label: `${daysRemaining}j restant`, color: "bg-yellow-500", daysRemaining }
    }
    return { status: "valid", label: "Valide", color: "bg-green-500", daysRemaining }
  }

  // Document stats
  const documentStats = React.useMemo(() => {
    const now = new Date()
    const docs = documents || []
    return {
      total: docs.length,
      expired: docs.filter(d => d.dateExpiration && new Date(d.dateExpiration) < now).length,
      expiringSoon: docs.filter(d => {
        if (!d.dateExpiration) return false
        const days = Math.ceil((new Date(d.dateExpiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return days > 0 && days <= 30
      }).length,
      valid: docs.filter(d => {
        if (!d.dateExpiration) return false
        const days = Math.ceil((new Date(d.dateExpiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return days > 30
      }).length,
    }
  }, [documents])
  
  // Calculer le kilométrage du dernier plein
  const dernierPleinKm = React.useMemo(() => {
    if (!vehicule?.pleinsCarburant || vehicule.pleinsCarburant.length === 0) {
      return null
    }
    const dernierPlein = vehicule.pleinsCarburant[0]
    return dernierPlein.kilometrage > 0 ? dernierPlein.kilometrage : null
  }, [vehicule?.pleinsCarburant])
  
  // Obtenir les années disponibles pour le filtre (année en cours et 4 années précédentes)
  const anneesDisponibles = React.useMemo(() => {
    const anneeEnCours = new Date().getFullYear()
    return [
      anneeEnCours,
      anneeEnCours - 1,
      anneeEnCours - 2,
      anneeEnCours - 3,
      anneeEnCours - 4,
    ]
  }, [])
  
  // Mois disponibles
  const moisOptions = [
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
  
  // Filtrer les pleins de carburant
  const pleinsFiltres = React.useMemo(() => {
    if (!vehicule?.pleinsCarburant) return []
    
    return vehicule.pleinsCarburant.filter((plein: any) => {
      const date = new Date(plein.date)
      const anneePlein = date.getFullYear()
      const moisPlein = date.getMonth() + 1
      
      if (filtreAnnee !== "all" && anneePlein !== parseInt(filtreAnnee)) return false
      if (filtreMois !== "all" && moisPlein !== parseInt(filtreMois)) return false
      
      return true
    })
  }, [vehicule?.pleinsCarburant, filtreAnnee, filtreMois])
  
  // Calculer les stats filtrées
  const statsFiltrees = React.useMemo(() => {
    const pleins = pleinsFiltres
    const totalLitres = pleins.reduce((sum: number, p: any) => sum + p.quantite, 0)
    const totalCout = pleins.reduce((sum: number, p: any) => sum + p.prixTotal, 0)
    const nbPleins = pleins.length
    
    return {
      totalLitres,
      totalCout,
      nbPleins,
      consommation: calculerConsommationMoyenne(pleins),
      coutKm: calculerCoutKm(pleins, totalCout),
    }
  }, [pleinsFiltres])
  
  // Types d'entretien disponibles (chargés depuis l'API)
  const [typesEntretien, setTypesEntretien] = React.useState<{ value: string; label: string }[]>([])
  
  // Charger les types d'entretien depuis l'API
  React.useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch("/api/types-entretien")
        const data = await response.json()
        if (data.success && data.data) {
          setTypesEntretien(data.data.map((type: any) => ({
            value: type.code,
            label: type.nom,
          })))
        }
      } catch (error) {
        console.error("Erreur chargement types entretien:", error)
      }
    }
    fetchTypes()
  }, [])
  
  // Filtrer les entretiens
  const entretiensFiltres = React.useMemo(() => {
    if (!vehicule?.entretiens) return []
    
    return vehicule.entretiens.filter((entretien: any) => {
      const date = new Date(entretien.dateIntervention)
      const anneeEntretien = date.getFullYear()
      const moisEntretien = date.getMonth() + 1
      
      if (filtreEntretienAnnee !== "all" && anneeEntretien !== parseInt(filtreEntretienAnnee)) return false
      if (filtreEntretienMois !== "all" && moisEntretien !== parseInt(filtreEntretienMois)) return false
      if (filtreEntretienType !== "all" && entretien.type !== filtreEntretienType) return false
      
      return true
    })
  }, [vehicule?.entretiens, filtreEntretienAnnee, filtreEntretienMois, filtreEntretienType])
  
  // Stats entretiens filtrées
  const statsEntretiensFiltrees = React.useMemo(() => {
    const entretiens = entretiensFiltres
    const totalCout = entretiens.reduce((sum: number, e: any) => sum + e.cout, 0)
    const nbEntretiens = entretiens.length
    
    return {
      totalCout,
      nbEntretiens,
    }
  }, [entretiensFiltres])
  
  if (!vehiculeId) return null
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !vehicule ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Véhicule non trouvé</p>
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-[#0066cc] flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-mono">
                      {vehicule.immatriculation}
                    </SheetTitle>
                    <SheetDescription>
                      {vehicule.marque} {vehicule.modele} - {vehicule.annee}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {vehicule.actif ? (
                    <Badge className="bg-green-500">Actif</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-500 text-white">Inactif</Badge>
                  )}
                </div>
              </div>
            </SheetHeader>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Gauge className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">{vehicule.kilometrage?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Kilomètres</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">{vehicule.capacite}</p>
                <p className="text-xs text-muted-foreground">Places</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Wrench className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">{vehicule._count?.entretiens || 0}</p>
                <p className="text-xs text-muted-foreground">Entretiens</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold">{documentStats.total}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
            
            {/* Tabs */}
            <Tabs defaultValue="informations" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="informations">Infos</TabsTrigger>
                <TabsTrigger value="achat">Achat</TabsTrigger>
                <TabsTrigger value="entretiens">Entretiens</TabsTrigger>
                <TabsTrigger value="carburant">Carburant</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              
              {/* Informations Tab */}
              <TabsContent value="informations" className="mt-4 space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Informations du véhicule
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Immatriculation:</span>
                      <p className="font-mono font-medium">{vehicule.immatriculation}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Marque / Modèle:</span>
                      <p className="font-medium">{vehicule.marque} {vehicule.modele}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Année:</span>
                      <p className="font-medium">{vehicule.annee}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Capacité:</span>
                      <p className="font-medium">{vehicule.capacite} places</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kilométrage:</span>
                      <p className="font-medium">{vehicule.kilometrage?.toLocaleString()} km</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date d&apos;ajout:</span>
                      <p className="font-medium">{formatDate(vehicule.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Chauffeur */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Chauffeur assigné
                  </h3>
                  {vehicule.chauffeur ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0066cc] flex items-center justify-center text-white font-semibold">
                        {vehicule.chauffeur.nom[0]}{vehicule.chauffeur.prenom[0]}
                      </div>
                      <div>
                        <p className="font-medium">{vehicule.chauffeur.nom} {vehicule.chauffeur.prenom}</p>
                        <p className="text-sm text-muted-foreground">{vehicule.chauffeur.telephone}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Aucun chauffeur assigné</p>
                  )}
                </div>
                
                {/* Statistiques */}
                {vehicule.stats && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      Statistiques
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-background rounded p-2">
                        <span className="text-muted-foreground">Total carburant:</span>
                        <p className="font-semibold text-[#ff6600]">
                          {formatCurrency(vehicule.stats.totalCarburantPrix)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({vehicule.stats.totalCarburantLitres?.toFixed(0)} L)
                        </p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <span className="text-muted-foreground">Total entretiens:</span>
                        <p className="font-semibold text-[#ff6600]">
                          {formatCurrency(vehicule.stats.totalEntretiensCout)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Achat Tab */}
              <TabsContent value="achat" className="mt-4">
                <AchatVehiculeTab 
                  vehiculeId={vehiculeId} 
                  onRefresh={handleRefreshData}
                />
              </TabsContent>
              
              {/* Entretiens Tab */}
              <TabsContent value="entretiens" className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold">Historique des entretiens</h3>
                  <Button 
                    size="sm" 
                    className="bg-[#0066cc] hover:bg-[#0052a3]"
                    onClick={() => {
                      setEditingEntretienId(null)
                      setEntretienFormOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {/* Filtres */}
                {vehicule.entretiens && vehicule.entretiens.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Filtrer par:</span>
                    <Select value={filtreEntretienAnnee} onValueChange={setFiltreEntretienAnnee}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les années</SelectItem>
                        {anneesDisponibles.map(annee => (
                          <SelectItem key={annee} value={annee.toString()}>
                            {annee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={filtreEntretienMois} 
                      onValueChange={setFiltreEntretienMois}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les mois</SelectItem>
                        {moisOptions.map(mois => (
                          <SelectItem key={mois.value} value={mois.value}>
                            {mois.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={filtreEntretienType} 
                      onValueChange={setFiltreEntretienType}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {typesEntretien.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const anneeEnCours = new Date().getFullYear().toString()
                        const moisEnCours = (new Date().getMonth() + 1).toString()
                        setFiltreEntretienAnnee(anneeEnCours)
                        setFiltreEntretienMois(moisEnCours)
                        setFiltreEntretienType("all")
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                )}

                {/* Statistiques Entretiens Filtrées */}
                {vehicule.entretiens && vehicule.entretiens.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                      <Wrench className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                      <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {statsEntretiensFiltrees.nbEntretiens}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {filtreEntretienAnnee === "all" && filtreEntretienMois === "all" && filtreEntretienType === "all" 
                          ? "Entretiens total" 
                          : "Entretiens filtrés"}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center border border-orange-200 dark:border-orange-800">
                      <p className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1 font-bold">DH</p>
                      <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                        {formatCurrency(statsEntretiensFiltrees.totalCout)}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        {filtreEntretienAnnee === "all" && filtreEntretienMois === "all" && filtreEntretienType === "all" 
                          ? "Coût total" 
                          : "Coût filtré"}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Info sur le nombre d'entretiens affichés */}
                {vehicule.entretiens && vehicule.entretiens.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Affichage de {entretiensFiltres.length} entretien{entretiensFiltres.length > 1 ? "s" : ""} 
                    {vehicule.entretiens.length !== entretiensFiltres.length && 
                      ` sur ${vehicule.entretiens.length} au total`
                    }
                  </p>
                )}
                
                {vehicule.entretiens?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun entretien enregistré</p>
                  </div>
                ) : entretiensFiltres.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun entretien pour cette période</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => {
                        setFiltreEntretienAnnee("all")
                        setFiltreEntretienMois("all")
                        setFiltreEntretienType("all")
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {entretiensFiltres.map((entretien: any) => (
                      <div key={entretien.id} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getTypeEntretienLabel(entretien.type)}</Badge>
                            {entretien.prochaineDate && new Date(entretien.prochaineDate) < new Date() && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#ff6600]">
                              {formatCurrency(entretien.cout)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditEntretien(entretien.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteEntretienId(entretien.id)
                                setDeleteEntretienDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(entretien.dateIntervention)}
                          {entretien.kilometrage && ` - ${entretien.kilometrage.toLocaleString()} km`}
                        </p>
                        {entretien.description && (
                          <p className="text-sm mt-1">{entretien.description}</p>
                        )}
                        {entretien.prochaineDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Prochain: {formatDate(entretien.prochaineDate)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Carburant Tab */}
              <TabsContent value="carburant" className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold">Historique du carburant</h3>
                  <Button 
                    size="sm" 
                    className="bg-[#0066cc] hover:bg-[#0052a3]"
                    onClick={() => {
                      setEditingCarburantId(null)
                      setCarburantFormOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {/* Filtres */}
                {vehicule.pleinsCarburant && vehicule.pleinsCarburant.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Filtrer par:</span>
                    <Select value={filtreAnnee} onValueChange={setFiltreAnnee}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les années</SelectItem>
                        {anneesDisponibles.map(annee => (
                          <SelectItem key={annee} value={annee.toString()}>
                            {annee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={filtreMois} 
                      onValueChange={setFiltreMois}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les mois</SelectItem>
                        {moisOptions.map(mois => (
                          <SelectItem key={mois.value} value={mois.value}>
                            {mois.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const anneeEnCours = new Date().getFullYear().toString()
                        const moisEnCours = (new Date().getMonth() + 1).toString()
                        setFiltreAnnee(anneeEnCours)
                        setFiltreMois(moisEnCours)
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                )}

                {/* Statistiques Carburant Filtrées */}
                {vehicule.pleinsCarburant && vehicule.pleinsCarburant.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                      <Fuel className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                      <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {statsFiltrees.totalLitres.toFixed(0)}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {filtreAnnee === "all" && filtreMois === "all" ? "Litres total" : "Litres filtrés"}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center border border-orange-200 dark:border-orange-800">
                      <p className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1 font-bold">DH</p>
                      <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                        {formatCurrency(statsFiltrees.totalCout)}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        {filtreAnnee === "all" && filtreMois === "all" ? "Coût total" : "Coût filtré"}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                      <Gauge className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                        {statsFiltrees.consommation}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">L/100km</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800">
                      <p className="h-5 w-5 mx-auto text-purple-600 dark:text-purple-400 mb-1 font-bold text-lg">≈</p>
                      <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                        {statsFiltrees.coutKm}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">DH/km</p>
                    </div>
                  </div>
                )}
                
                {/* Info sur le nombre de pleins affichés */}
                {vehicule.pleinsCarburant && vehicule.pleinsCarburant.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Affichage de {pleinsFiltres.length} plein{pleinsFiltres.length > 1 ? "s" : ""} 
                    {vehicule.pleinsCarburant.length !== pleinsFiltres.length && 
                      ` sur ${vehicule.pleinsCarburant.length} au total`
                    }
                  </p>
                )}
                
                {vehicule.pleinsCarburant?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Fuel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun plein enregistré</p>
                  </div>
                ) : pleinsFiltres.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Fuel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun plein pour cette période</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => {
                        setFiltreAnnee("all")
                        setFiltreMois("all")
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {pleinsFiltres.map((plein: any) => (
                      <div key={plein.id} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{plein.quantite.toFixed(2)} L</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#ff6600]">
                              {formatCurrency(plein.prixTotal)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditCarburant(plein.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteCarburantId(plein.id)
                                setDeleteCarburantDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(plein.date)}
                          {plein.kilometrage > 0 && ` - ${plein.kilometrage.toLocaleString()} km`}
                        </p>
                        {plein.station && (
                          <p className="text-xs text-muted-foreground">{plein.station}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-4">
                {/* Document Stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold">{documentStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                    <p className="text-lg font-semibold text-red-600">{documentStats.expired}</p>
                    <p className="text-xs text-red-600">Expirés</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                    <p className="text-lg font-semibold text-orange-600">{documentStats.expiringSoon}</p>
                    <p className="text-xs text-orange-600">Expirent bientôt</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                    <p className="text-lg font-semibold text-green-600">{documentStats.valid}</p>
                    <p className="text-xs text-green-600">Valides</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Documents du véhicule</h3>
                  <Button 
                    size="sm" 
                    className="bg-[#0066cc] hover:bg-[#0052a3]"
                    onClick={() => {
                      setEditingDocument(null)
                      setDocumentFormOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun document enregistré</p>
                    <p className="text-sm mt-1">Ajoutez des documents pour suivre les dates d&apos;expiration</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc: any) => {
                      const status = getDocumentStatus(doc.dateExpiration)
                      return (
                        <div key={doc.id} className="bg-muted/30 rounded-lg p-3 relative overflow-hidden">
                          {/* Expiration indicator stripe */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${status.color}`} />
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{getDocumentTypeLabel(doc.type)}</span>
                                {doc.numero && (
                                  <p className="text-xs text-muted-foreground">N° {doc.numero}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${status.color} text-white`}>
                                {status.label}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  {doc.fichier && (() => {
                                    const fileUrl = getFileUrl(doc.fichier);
                                    return fileUrl && (
                                      <>
                                        <DropdownMenuItem asChild>
                                          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Eye className="mr-2 h-4 w-4" />
                                            Voir
                                          </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                          <a href={fileUrl} download>
                                            <Download className="mr-2 h-4 w-4" />
                                            Télécharger
                                          </a>
                                        </DropdownMenuItem>
                                      </>
                                    );
                                  })()}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setDeleteDocumentId(doc.id)
                                      setDeleteDocumentDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {doc.dateExpiration && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Expire le {formatDate(doc.dateExpiration)}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <Separator className="my-4" />
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(vehicule.id)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
      
      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le véhicule{" "}
              <strong>{vehicule?.immatriculation}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forms */}
      {vehiculeId && vehicule && (
        <>
          <EntretienForm
            vehiculeId={vehiculeId}
            editingId={editingEntretienId}
            open={entretienFormOpen}
            onOpenChange={(open) => {
              setEntretienFormOpen(open)
              if (!open) setEditingEntretienId(null)
            }}
            onSuccess={handleRefreshData}
          />
          <CarburantForm
            vehiculeId={vehiculeId}
            vehiculeKilometrage={vehicule.kilometrage || 0}
            dernierPleinKm={dernierPleinKm}
            editingId={editingCarburantId}
            open={carburantFormOpen}
            onOpenChange={(open) => {
              setCarburantFormOpen(open)
              if (!open) setEditingCarburantId(null)
            }}
            onSuccess={handleRefreshData}
          />
          <DocumentVehiculeForm
            vehicule={vehicule}
            document={editingDocument}
            open={documentFormOpen}
            onOpenChange={(open) => {
              setDocumentFormOpen(open)
              if (!open) setEditingDocument(null)
            }}
            onSuccess={handleRefreshData}
          />
        </>
      )}

      {/* Delete carburant confirmation */}
      <AlertDialog open={deleteCarburantDialogOpen} onOpenChange={setDeleteCarburantDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le plein ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce plein de carburant ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCarburant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete entretien confirmation */}
      <AlertDialog open={deleteEntretienDialogOpen} onOpenChange={setDeleteEntretienDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;entretien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet entretien ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntretien}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete document confirmation */}
      <AlertDialog open={deleteDocumentDialogOpen} onOpenChange={setDeleteDocumentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
