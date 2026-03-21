"use client"

import * as React from "react"
import { Truck, Plus, Pencil, Trash2, Search, User, Gauge, Wrench, Fuel, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
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
import { useVehicules, useDeleteVehicule } from "@/hooks/use-queries"
import { formatDate } from "@/lib/format"

interface VehiculesListProps {
  onAdd: () => void
  onEdit: (id: string) => void
  onView: (id: string) => void
  refreshKey?: number
}

export function VehiculesList({ onAdd, onEdit, onView, refreshKey }: VehiculesListProps) {
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteVehiculeData, setDeleteVehiculeData] = React.useState<any>(null)
  const { toast } = useToast()

  const { data: response, isLoading, refetch } = useVehicules({ page, search })
  const deleteVehicule = useDeleteVehicule()

  React.useEffect(() => {
    if (refreshKey) {
      refetch()
    }
  }, [refreshKey, refetch])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      refetch()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, refetch])

  const vehicules = response?.data || []
  const pagination = response?.pagination

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const result = await deleteVehicule.mutateAsync(deleteId)
      setDeleteDialogOpen(false)
      setDeleteId(null)
      setDeleteVehiculeData(null)
      refetch()
      
      // Show appropriate toast message
      if (result.action === 'deactivated') {
        toast({
          title: "Véhicule désactivé",
          description: "Le véhicule a été désactivé car il a des relations (services, entretiens ou pleins de carburant).",
        })
      } else {
        toast({
          title: "Véhicule supprimé",
          description: "Le véhicule a été supprimé avec succès.",
        })
      }
    } catch (error) {
      console.error("Erreur suppression:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la suppression du véhicule.",
      })
    }
  }

  const confirmDelete = (vehicule: any) => {
    setDeleteId(vehicule.id)
    setDeleteVehiculeData(vehicule)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par immatriculation, marque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onAdd} className="bg-[#0066cc] hover:bg-[#0052a3]">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un véhicule
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : vehicules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun véhicule trouvé</p>
            {search && (
              <Button variant="link" onClick={() => setSearch("")} className="mt-2">
                Effacer la recherche
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Kilométrage</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicules.map((vehicule: any) => (
                <TableRow 
                  key={vehicule.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onView(vehicule.id)}
                >
                  <TableCell className="font-mono font-medium">
                    {vehicule.immatriculation}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vehicule.marque} {vehicule.modele}</p>
                      <p className="text-xs text-muted-foreground">{vehicule.annee} • {vehicule.capacite} places</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span>{vehicule.kilometrage?.toLocaleString()} km</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vehicule.chauffeur ? (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-semibold">
                          {vehicule.chauffeur.nom[0]}{vehicule.chauffeur.prenom[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{vehicule.chauffeur.nom} {vehicule.chauffeur.prenom}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vehicule.actif ? (
                      <Badge className="bg-green-500">Actif</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-500 text-white">Inactif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(vehicule.id)}>
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(vehicule.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => confirmDelete(vehicule)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {vehicule.actif ? "Supprimer" : "Supprimer définitivement"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {((pagination.page - 1) * pagination.pageSize) + 1} à{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} sur {pagination.total} véhicules
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Delete/Deactivate confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteVehiculeData?.actif !== false ? "Supprimer le véhicule ?" : "Supprimer définitivement ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteVehiculeData?.actif !== false ? (
                <span>
                  Si ce véhicule a des relations (services, entretiens, pleins de carburant), 
                  il sera <strong>désactivé</strong> au lieu d'être supprimé pour préserver l'historique.
                </span>
              ) : (
                <span>
                  Ce véhicule est inactif et n'a pas de relations. Il sera <strong>supprimé définitivement</strong>.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
