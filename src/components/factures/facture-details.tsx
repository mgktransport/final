"use client";

import * as React from "react";
import {
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Edit,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  User,
  MapPin,
  Loader2,
} from "lucide-react";
import { useFacture } from "@/hooks/use-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatutFacture, ModePaiement } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Status Badge
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

  const icons: Record<StatutFacture, React.ReactNode> = {
    EN_ATTENTE: <Clock className="h-3 w-3 mr-1" />,
    PAYEE: <CheckCircle className="h-3 w-3 mr-1" />,
    EN_RETARD: <AlertCircle className="h-3 w-3 mr-1" />,
    ANNULEE: <AlertCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <Badge variant="outline" className={`${colors[statut]} flex items-center`}>
      {icons[statut]}
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

interface FactureDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factureId?: string | null;
  onEdit?: (facture: any) => void;
  onAddPaiement?: (factureId: string) => void;
}

export function FactureDetails({
  open,
  onOpenChange,
  factureId,
  onEdit,
  onAddPaiement,
}: FactureDetailsProps) {
  const { data: facture, isLoading } = useFacture(factureId || "");
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleEdit = () => {
    if (facture && onEdit && facture.statut !== StatutFacture.PAYEE && facture.statut !== StatutFacture.ANNULEE) {
      onEdit(facture);
      onOpenChange(false);
    }
  };

  const handleAddPaiement = () => {
    if (facture && onAddPaiement && facture.statut !== StatutFacture.PAYEE && facture.statut !== StatutFacture.ANNULEE) {
      onAddPaiement(facture.id);
    }
  };

  const handleDownloadPDF = async () => {
    if (!factureId) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/factures/${factureId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture_${facture?.numero || 'export'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Get the payment info (simplified)
  const dernierPaiement = facture?.paiements?.[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {/* Loading skeleton */}
        {isLoading && factureId ? (
          <>
            <SheetHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </>
        ) : !facture ? (
          <>
            <SheetHeader>
              <SheetTitle>Aucune facture sélectionnée</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p>Sélectionnez une facture pour voir les détails</p>
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#ff6600]/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[#ff6600]" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-mono">
                      {facture.numero}
                    </SheetTitle>
                    <SheetDescription>
                      Détails de la facture
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge statut={facture.statut} />
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Client Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Informations client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{facture.client?.nomEntreprise}</span>
                  </div>
                  {facture.client?.telephone && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Tél: {facture.client.telephone}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date d&apos;émission</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(facture.dateEmission)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date d&apos;échéance</p>
                      <p className={`font-medium flex items-center gap-1 ${facture.statut === StatutFacture.EN_RETARD ? 'text-red-600' : ''}`}>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(facture.dateEcheance)}
                        {facture.statut === StatutFacture.EN_RETARD && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Montants */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Détail des montants
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Montant HT</span>
                    <span className="font-medium">{formatCurrency(facture.montantHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVA ({facture.tauxTVA}%)</span>
                    <span>{formatCurrency(facture.montantTVA)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Montant TTC</span>
                    <span className="text-[#0066cc]">{formatCurrency(facture.montantTTC)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Services facturés */}
              {facture.exploitations && facture.exploitations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Services facturés ({facture.exploitations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Véhicule</TableHead>
                            <TableHead className="text-right">Tarif</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {facture.exploitations.map((exploitation: any) => (
                            <TableRow key={exploitation.id}>
                              <TableCell className="text-sm">
                                {formatDate(exploitation.dateHeureDepart)}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-sm">
                                    {exploitation.service?.nomService}
                                  </div>
                                  {exploitation.service?.lieuDepart && exploitation.service?.lieuArrive && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      {exploitation.service.lieuDepart} → {exploitation.service.lieuArrive}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    {exploitation.chauffeur?.nom} {exploitation.chauffeur?.prenom}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Truck className="h-3 w-3 text-muted-foreground" />
                                  {exploitation.vehicule?.immatriculation}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-[#0066cc]">
                                {formatCurrency(exploitation.service?.tarif || 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    <div className="p-3 border-t bg-muted/30">
                      <div className="flex justify-between text-sm">
                        <span>Total services:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            facture.exploitations.reduce(
                              (sum: number, exp: any) => sum + (exp.service?.tarif || 0),
                              0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paiement - Simplifié */}
              {facture.statut === StatutFacture.PAYEE && dernierPaiement && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Paiement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode de paiement</span>
                      <span className="font-medium flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        {getModePaiementLabel(dernierPaiement.mode)}
                      </span>
                    </div>
                    {dernierPaiement.reference && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Référence</span>
                        <span className="font-mono">{dernierPaiement.reference}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{formatDate(dernierPaiement.date)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Montant payé</span>
                      <span className="text-green-600">{formatCurrency(dernierPaiement.montant)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add payment button for unpaid invoices */}
              {facture.statut !== StatutFacture.PAYEE && facture.statut !== StatutFacture.ANNULEE && (
                <Button
                  onClick={handleAddPaiement}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Enregistrer le paiement
                </Button>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {facture.statut !== StatutFacture.PAYEE && facture.statut !== StatutFacture.ANNULEE && (
                  <Button variant="outline" onClick={handleEdit} className="flex-1">
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                )}
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={isDownloading}
                  className="flex-1 bg-[#0066cc] hover:bg-[#0066cc]/90"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default FactureDetails;
