"use client";

import * as React from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Edit,
  CreditCard,
  Plus,
  Route,
  MapPin as LocationIcon,
  Users,
  DollarSign,
  Calendar,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useClient, useDeleteService } from "@/hooks/use-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { TypeContratClient, StatutFacture, ModePaiement, TypeService } from "@/types";
import type { Service } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ServiceForm } from "@/components/services/service-form";
import { toast } from "sonner";

// Contract Type Badge
function ContractBadge({ type }: { type: TypeContratClient }) {
  const colors: Record<TypeContratClient, string> = {
    MENSUEL: "bg-blue-100 text-blue-800",
    ANNUEL: "bg-purple-100 text-purple-800",
    PONCTUEL: "bg-amber-100 text-amber-800",
  };

  const labels: Record<TypeContratClient, string> = {
    MENSUEL: "Mensuel",
    ANNUEL: "Annuel",
    PONCTUEL: "Ponctuel",
  };

  return (
    <Badge variant="outline" className={colors[type]}>
      {labels[type]}
    </Badge>
  );
}

// Status Badge
function StatusBadge({ actif }: { actif: boolean }) {
  return (
    <Badge
      variant={actif ? "default" : "secondary"}
      className={
        actif
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-600"
      }
    >
      {actif ? "Actif" : "Inactif"}
    </Badge>
  );
}

// Service Type Badge
function ServiceTypeBadge({ type }: { type: TypeService }) {
  const colors: Record<TypeService, string> = {
    TRAJET_JOURNALIER: "bg-blue-100 text-blue-800",
    SERVICE_EXCEPTIONNEL: "bg-orange-100 text-orange-800",
  };

  const labels: Record<TypeService, string> = {
    TRAJET_JOURNALIER: "Trajet journalier",
    SERVICE_EXCEPTIONNEL: "Service exceptionnel",
  };

  return (
    <Badge variant="outline" className={colors[type]}>
      {labels[type]}
    </Badge>
  );
}

// Facture Status Badge
function FactureStatusBadge({ statut }: { statut: StatutFacture }) {
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

// Mode Paiement Label
function getModePaiementLabel(mode: ModePaiement): string {
  const labels: Record<ModePaiement, string> = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    CHEQUE: "Chèque",
  };
  return labels[mode];
}

interface ClientDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string | null;
  onEdit?: (client: any) => void;
}

export function ClientDetails({
  open,
  onOpenChange,
  clientId,
  onEdit,
}: ClientDetailsProps) {
  const { data: client, isLoading, error, refetch } = useClient(clientId || "");
  const [serviceFormOpen, setServiceFormOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [serviceToDelete, setServiceToDelete] = React.useState<Service | null>(null);
  
  const deleteServiceMutation = useDeleteService();

  // Refetch when dialog opens
  React.useEffect(() => {
    if (open && clientId) {
      refetch();
    }
  }, [open, clientId, refetch]);

  const handleEdit = () => {
    if (client && onEdit) {
      onEdit(client);
      onOpenChange(false);
    }
  };

  const handleAddService = () => {
    setSelectedService(null);
    setServiceFormOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setServiceFormOpen(true);
  };

  const handleServiceSuccess = () => {
    setServiceFormOpen(false);
    setSelectedService(null);
    refetch();
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;
    
    try {
      const result = await deleteServiceMutation.mutateAsync(serviceToDelete.id);
      if (result.success) {
        toast.success(result.message || "Service supprimé avec succès");
        refetch();
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression du service");
    } finally {
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  // Loading skeleton
  if (isLoading && clientId) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#0066cc]/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[#0066cc]" />
              </div>
              <div>
                <SheetTitle className="text-xl">
                  {client.nomEntreprise}
                </SheetTitle>
                <SheetDescription>
                  Détails du client
                </SheetDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.telephone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                )}
              </div>
              
              {client.contact && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Contact:</span>
                  <span className="text-sm">{client.contact}</span>
                </div>
              )}
              
              {client.adresse && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{client.adresse}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type de contrat:</span>
                  <ContractBadge type={client.typeContrat} />
                </div>
                <StatusBadge actif={client.actif} />
              </div>

              {client.dateFinContrat && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fin de contrat:</span>
                  <span className="text-sm font-medium">
                    {formatDate(client.dateFinContrat)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Services, Factures, Paiements */}
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">
                Services ({client.services?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="factures">
                Factures ({client.factures?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="paiements">
                Paiements ({client.paiements?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Services du client</CardTitle>
                    <Button size="sm" onClick={handleAddService} className="bg-[#0066cc] hover:bg-[#0066cc]/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {client.services && client.services.length > 0 ? (
                    <div className="divide-y">
                      {client.services.map((service: Service) => (
                        <div
                          key={service.id}
                          className="p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div 
                              className="space-y-2 flex-1 cursor-pointer"
                              onClick={() => handleEditService(service)}
                            >
                              <div className="flex items-center gap-2">
                                <Route className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{service.nomService}</span>
                                <ServiceTypeBadge type={service.typeService} />
                                {!service.actif && (
                                  <Badge variant="secondary" className="text-xs">Inactif</Badge>
                                )}
                              </div>
                              
                              {service.description && (
                                <p className="text-sm text-muted-foreground">
                                  {service.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {(service.lieuDepart || service.lieuArrive) && (
                                  <div className="flex items-center gap-1">
                                    <LocationIcon className="h-3 w-3" />
                                    <span>
                                      {service.lieuDepart || "?"} → {service.lieuArrive || "?"}
                                    </span>
                                  </div>
                                )}
                                {service.heureDepart && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{service.heureDepart}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>Min. {service.nombreSalariesMin} salariés</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-lg font-semibold text-[#0066cc]">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(service.tarif)}
                                </div>
                                <p className="text-xs text-muted-foreground">par trajet</p>
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditService(service)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(service)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Route className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-medium">Aucun service associé</p>
                      <p className="text-sm mt-1">Ajoutez un service pour ce client</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={handleAddService}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un service
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Factures Tab */}
            <TabsContent value="factures" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {client.factures && client.factures.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Facture</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Montant TTC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.factures.map((facture: any) => (
                          <TableRow key={facture.id}>
                            <TableCell className="font-mono text-sm">{facture.numero}</TableCell>
                            <TableCell>{formatDate(facture.dateEmission)}</TableCell>
                            <TableCell>
                              <FactureStatusBadge statut={facture.statut} />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(facture.montantTTC)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2" />
                      <p>Aucune facture</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Paiements Tab */}
            <TabsContent value="paiements" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {client.paiements && client.paiements.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.paiements.map((paiement: any) => (
                          <TableRow key={paiement.id}>
                            <TableCell>{formatDate(paiement.date)}</TableCell>
                            <TableCell>{getModePaiementLabel(paiement.mode)}</TableCell>
                            <TableCell>{paiement.reference || "-"}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(paiement.montant)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mb-2" />
                      <p>Aucun paiement</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Service Form Dialog */}
      <ServiceForm
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        clientId={clientId || ""}
        service={selectedService}
        onSuccess={handleServiceSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le service &quot;{serviceToDelete?.nomService}&quot; ?
              <br /><br />
              {serviceToDelete?._count?.tournées && serviceToDelete._count.tournées > 0 ? (
                <span className="text-orange-600 font-medium">
                  ⚠️ Ce service a {serviceToDelete._count.tournées} tournée(s) associée(s). 
                  Il sera désactivé mais pas supprimé définitivement.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Ce service n&apos;a pas de tournées associées. Il sera supprimé définitivement.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteServiceMutation.isPending}
            >
              {deleteServiceMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

export default ClientDetails;
