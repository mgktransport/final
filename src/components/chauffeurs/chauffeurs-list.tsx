"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useChauffeurs, useDeleteChauffeur } from "@/hooks/use-queries";
import { formatCurrency } from "@/lib/format";
import { TypeContrat, TypeSalaire, type Chauffeur, type SalaireActuel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Status Badge Component
function StatusBadge({ actif }: { actif: boolean }) {
  return (
    <Badge
      variant={actif ? "default" : "secondary"}
      className={
        actif
          ? "bg-green-100 text-green-800 hover:bg-green-100"
          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
      }
    >
      {actif ? "Actif" : "Inactif"}
    </Badge>
  );
}

// Contract Type Badge
function ContractBadge({ type }: { type: TypeContrat }) {
  const colors: Record<TypeContrat, string> = {
    CDI: "bg-blue-100 text-blue-800",
    CDD: "bg-purple-100 text-purple-800",
    JOURNALIER: "bg-amber-100 text-amber-800",
  };

  return (
    <Badge variant="outline" className={colors[type]}>
      {type}
    </Badge>
  );
}

// Salary Type Label
function getSalaireTypeLabel(type: TypeSalaire): string {
  const labels: Record<TypeSalaire, string> = {
    FIXE: "Fixe",
    HORAIRE: "Horaire",
    PAR_TOURNEE: "Par tournée",
  };
  return labels[type];
}

// Current Month Salary Badge
function SalaireMoisBadge({ salaireActuel }: { salaireActuel?: SalaireActuel | null }) {
  const now = new Date();
  const moisActuel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  if (!salaireActuel) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 w-fit">
          Non calculé
        </Badge>
        <span className="text-xs text-muted-foreground capitalize">{moisActuel}</span>
      </div>
    );
  }
  
  if (salaireActuel.paye) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 w-fit">
            <CheckCircle className="mr-1 h-3 w-3" />
            Payé
          </Badge>
        </div>
        <span className="text-sm font-semibold text-green-700">
          {formatCurrency(salaireActuel.montantNet)}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit">
        <Clock className="mr-1 h-3 w-3" />
        En attente
      </Badge>
      <span className="text-sm font-semibold text-amber-700">
        {formatCurrency(salaireActuel.montantNet)}
      </span>
    </div>
  );
}

// Props Interface
interface ChauffeursListProps {
  onAddChauffeur?: () => void;
  onEditChauffeur?: (chauffeur: Chauffeur) => void;
  onViewChauffeur?: (chauffeur: Chauffeur) => void;
}

export function ChauffeursList({
  onAddChauffeur,
  onEditChauffeur,
  onViewChauffeur,
}: ChauffeursListProps) {
  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chauffeurToDelete, setChauffeurToDelete] = useState<Chauffeur | null>(null);
  const pageSize = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Queries
  const { data, isLoading, isError, error } = useChauffeurs({
    actif: statusFilter === "all" ? undefined : statusFilter === "actif",
    search: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteChauffeur();

  // Handlers
  const handleDeleteClick = (chauffeur: Chauffeur) => {
    setChauffeurToDelete(chauffeur);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (chauffeurToDelete) {
      try {
        await deleteMutation.mutateAsync(chauffeurToDelete.id);
        setDeleteDialogOpen(false);
        setChauffeurToDelete(null);
      } catch (error) {
        console.error("Error deleting chauffeur:", error);
      }
    }
  };

  // Filter chauffeurs based on status
  const filteredChauffeurs = useMemo(() => {
    if (!data?.data) return [];
    let result = data.data;

    if (statusFilter !== "all") {
      const isActif = statusFilter === "actif";
      result = result.filter((c) => c.actif === isActif);
    }

    return result;
  }, [data?.data, statusFilter]);

  // Pagination
  const totalPages = data?.totalPages || 1;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive mb-4">
            Erreur lors du chargement des chauffeurs
          </p>
          <p className="text-muted-foreground text-sm">
            {error?.message || "Veuillez réessayer plus tard"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Gestion des Chauffeurs</CardTitle>
            </div>
            <Button
              onClick={onAddChauffeur}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un chauffeur
            </Button>
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, CIN, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nom complet</TableHead>
                  <TableHead className="font-semibold">CIN</TableHead>
                  <TableHead className="font-semibold">Téléphone</TableHead>
                  <TableHead className="font-semibold">Type contrat</TableHead>
                  <TableHead className="font-semibold">Salaire base</TableHead>
                  <TableHead className="font-semibold">Salaire du mois</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChauffeurs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      {search || statusFilter !== "all"
                        ? "Aucun chauffeur ne correspond à votre recherche"
                        : "Aucun chauffeur enregistré"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChauffeurs.map((chauffeur) => (
                    <TableRow
                      key={chauffeur.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => onViewChauffeur?.(chauffeur)}
                    >
                      <TableCell className="font-medium">
                        {chauffeur.nom} {chauffeur.prenom}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {chauffeur.cin}
                      </TableCell>
                      <TableCell>{chauffeur.telephone}</TableCell>
                      <TableCell>
                        <ContractBadge type={chauffeur.typeContrat} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCurrency(chauffeur.montantSalaire)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getSalaireTypeLabel(chauffeur.typeSalaire)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SalaireMoisBadge salaireActuel={chauffeur.salaireActuel} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge actif={chauffeur.actif} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewChauffeur?.(chauffeur);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditChauffeur?.(chauffeur);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(chauffeur);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data?.total || 0)} sur {data?.total || 0} chauffeurs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le chauffeur{" "}
              <strong>
                {chauffeurToDelete?.nom} {chauffeurToDelete?.prenom}
              </strong>
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ChauffeursList;
