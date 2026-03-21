"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  Download,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useFactures, useDeleteFacture, useClients } from "@/hooks/use-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatutFacture, type Facture } from "@/types";
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
import { toast } from "sonner";

// Status Badge Component
function StatusBadge({ statut }: { statut: StatutFacture }) {
  const colors: Record<StatutFacture, string> = {
    EN_ATTENTE: "bg-blue-100 text-blue-800",
    PAYEE: "bg-green-100 text-green-800",
    EN_RETARD: "bg-red-100 text-red-800",
    ANNULEE: "bg-gray-100 text-gray-600",
  };

  const labels: Record<StatutFacture, string> = {
    EN_ATTENTE: "En attente",
    PAYEE: "Payée",
    EN_RETARD: "En retard",
    ANNULEE: "Annulée",
  };

  return (
    <Badge variant="outline" className={colors[statut]}>
      {labels[statut]}
    </Badge>
  );
}

// Props Interface
interface FacturesListProps {
  onAddFacture?: () => void;
  onEditFacture?: (facture: Facture) => void;
  onViewFacture?: (facture: Facture) => void;
  onAddPaiement?: (factureId: string) => void;
}

export function FacturesList({
  onAddFacture,
  onEditFacture,
  onViewFacture,
  onAddPaiement,
}: FacturesListProps) {
  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [factureToDelete, setFactureToDelete] = useState<Facture | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
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
  const { data, isLoading, isError, error } = useFactures({
    statut: statusFilter === "all" ? undefined : statusFilter,
    clientId: clientFilter === "all" ? undefined : clientFilter,
    search: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const { data: clientsData } = useClients({ pageSize: 100 });
  const deleteMutation = useDeleteFacture();

  // Handlers
  const handleDeleteClick = (facture: Facture) => {
    setFactureToDelete(facture);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (factureToDelete) {
      try {
        await deleteMutation.mutateAsync(factureToDelete.id);
        setDeleteDialogOpen(false);
        setFactureToDelete(null);
      } catch (error) {
        console.error("Error deleting facture:", error);
      }
    }
  };

  // Download PDF handler
  const handleDownloadPDF = async (facture: Facture) => {
    setDownloadingIds(prev => new Set(prev).add(facture.id));
    
    try {
      const response = await fetch(`/api/factures/${facture.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture_${facture.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(facture.id);
        return newSet;
      });
    }
  };

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
            Erreur lors du chargement des factures
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
              <FileText className="h-5 w-5 text-[#ff6600]" />
              <CardTitle className="text-xl">Liste des Factures</CardTitle>
            </div>
            <Button
              onClick={onAddFacture}
              className="bg-[#0066cc] hover:bg-[#0066cc]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
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
                placeholder="Rechercher par numéro, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value={StatutFacture.EN_ATTENTE}>En attente</SelectItem>
                <SelectItem value={StatutFacture.PAYEE}>Payée</SelectItem>
                <SelectItem value={StatutFacture.EN_RETARD}>En retard</SelectItem>
                <SelectItem value={StatutFacture.ANNULEE}>Annulée</SelectItem>
              </SelectContent>
            </Select>

            {/* Client Filter */}
            <Select
              value={clientFilter}
              onValueChange={(value) => {
                setClientFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clientsData?.data?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nomEntreprise}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead className="font-semibold">N° Facture</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Date émission</TableHead>
                  <TableHead className="font-semibold">Échéance</TableHead>
                  <TableHead className="font-semibold">Montant TTC</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.data || data.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      {search || statusFilter !== "all" || clientFilter !== "all"
                        ? "Aucune facture ne correspond à votre recherche"
                        : "Aucune facture enregistrée"}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((facture) => (
                    <TableRow
                      key={facture.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => onViewFacture?.(facture)}
                    >
                      <TableCell className="font-mono text-sm">
                        {facture.numero}
                      </TableCell>
                      <TableCell className="font-medium">
                        {facture.client?.nomEntreprise || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(facture.dateEmission)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(facture.dateEcheance)}
                          {facture.statut === StatutFacture.EN_RETARD && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(facture.montantTTC)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge statut={facture.statut} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Bouton Paiement rapide */}
                          {facture.statut !== StatutFacture.PAYEE && 
                           facture.statut !== StatutFacture.ANNULEE && onAddPaiement && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddPaiement(facture.id);
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Paiement
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
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
                                  onViewFacture?.(facture);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(facture);
                                }}
                                disabled={downloadingIds.has(facture.id)}
                              >
                                {downloadingIds.has(facture.id) ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-4 w-4" />
                                )}
                                {downloadingIds.has(facture.id) ? 'Génération...' : 'Télécharger PDF'}
                              </DropdownMenuItem>
                              {facture.statut !== StatutFacture.PAYEE && 
                               facture.statut !== StatutFacture.ANNULEE && (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditFacture?.(facture);
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
                                      handleDeleteClick(facture);
                                    }}
                                    disabled={facture._count?.paiements ? facture._count.paiements > 0 : false}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
            Affichage {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data?.total || 0)} sur {data?.total || 0} factures
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
              Êtes-vous sûr de vouloir supprimer la facture{" "}
              <strong>{factureToDelete?.numero}</strong> ?
              <span className="block mt-2">Cette action est irréversible.</span>
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

export default FacturesList;
