"use client";

import * as React from "react";
import { useState } from "react";
import { FileText, Plus, Download, Eye, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import type { Chauffeur, BulletinPaie } from "@/types";
import { BulletinPaieForm } from "@/components/bulletins-paie/bulletin-paie-form";

interface BulletinsTabProps {
  chauffeur: Chauffeur;
}

const moisOptions = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export function BulletinsTab({ chauffeur }: BulletinsTabProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<BulletinPaie | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulletins, setBulletins] = useState<BulletinPaie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editBulletin, setEditBulletin] = useState<BulletinPaie | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Fetch bulletins
  const fetchBulletins = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bulletins-paie?chauffeurId=${chauffeur.id}&pageSize=50`);
      const result = await response.json();
      if (result.success && result.data) {
        setBulletins(result.data.data || []);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les bulletins",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [chauffeur.id, toast]);

  React.useEffect(() => {
    fetchBulletins();
  }, [fetchBulletins]);

  const handleViewBulletin = (bulletin: BulletinPaie) => {
    setSelectedBulletin(bulletin);
    setShowPreview(true);
  };

  const handleEditBulletin = (bulletin: BulletinPaie) => {
    setEditBulletin(bulletin);
    setShowEditForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const response = await fetch(`/api/bulletins-paie/${deleteId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Succès",
          description: "Bulletin supprimé avec succès",
        });
        fetchBulletins();
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la suppression",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleDownloadPdf = async (bulletinId: string) => {
    try {
      const response = await fetch(`/api/bulletins-paie/${bulletinId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulletin_de_paie.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Succès",
        description: "PDF téléchargé avec succès",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement du PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Bulletins de Paie</CardTitle>
              <CardDescription>
                Historique des bulletins de paie de {chauffeur.nom} {chauffeur.prenom}
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bulletin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bulletins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun bulletin de paie généré</p>
              <p className="text-sm mt-2">
                Cliquez sur "Nouveau bulletin" pour générer un bulletin
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead className="text-right">Salaire Brut</TableHead>
                    <TableHead className="text-right">Retenues</TableHead>
                    <TableHead className="text-right">Net à Payer</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulletins.map((bulletin) => (
                    <TableRow key={bulletin.id}>
                      <TableCell>{moisOptions[bulletin.mois - 1]}</TableCell>
                      <TableCell>{bulletin.annee}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bulletin.salaireBrut)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        - {formatCurrency(bulletin.totalRetenues)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(bulletin.salaireNet)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewBulletin(bulletin)}
                            title="Voir le bulletin"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditBulletin(bulletin)}
                            title="Modifier"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPdf(bulletin.id)}
                            title="Télécharger PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(bulletin.id)}
                            title="Supprimer"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog - Create */}
      <BulletinPaieForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            fetchBulletins();
          }
        }}
      />

      {/* Form Dialog - Edit */}
      <BulletinPaieForm
        open={showEditForm}
        onOpenChange={(open) => {
          setShowEditForm(open);
          if (!open) {
            setEditBulletin(null);
            fetchBulletins();
          }
        }}
        editBulletin={editBulletin}
      />

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulletin de Paie</DialogTitle>
            <DialogDescription>
              {selectedBulletin && (
                <>{moisOptions[selectedBulletin.mois - 1]} {selectedBulletin.annee}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBulletin && (
            <div className="space-y-4">
              {/* Chauffeur Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Nom & Prénom</p>
                  <p className="font-semibold">{chauffeur.nom} {chauffeur.prenom}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CIN</p>
                  <p className="font-semibold">{chauffeur.cin}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">N° CNSS</p>
                  <p className="font-semibold">{chauffeur.numeroCNSS || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Poste</p>
                  <p className="font-semibold">Chauffeur</p>
                </div>
              </div>

              {/* Gains */}
              <div>
                <h4 className="font-semibold mb-2">Gains</h4>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Montant (DH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Salaire de base</td>
                      <td className="text-right py-2">{formatCurrency(selectedBulletin.salaireBase)}</td>
                    </tr>
                    {selectedBulletin.heuresSupplementaires > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Heures supplémentaires</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.heuresSupplementaires)}</td>
                      </tr>
                    )}
                    {selectedBulletin.primeTrajet > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Prime de trajet</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.primeTrajet)}</td>
                      </tr>
                    )}
                    {selectedBulletin.primeRendement > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Prime de rendement</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.primeRendement)}</td>
                      </tr>
                    )}
                    {selectedBulletin.indemniteDeplacement > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Indemnité de déplacement</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.indemniteDeplacement)}</td>
                      </tr>
                    )}
                    {selectedBulletin.indemnitePanier > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Indemnité panier</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.indemnitePanier)}</td>
                      </tr>
                    )}
                    {selectedBulletin.autresPrimes > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Autres primes</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.autresPrimes)}</td>
                      </tr>
                    )}
                    <tr className="bg-muted font-semibold">
                      <td className="py-2">Salaire Brut</td>
                      <td className="text-right py-2">{formatCurrency(selectedBulletin.salaireBrut)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Retenues */}
              <div>
                <h4 className="font-semibold mb-2">Retenues</h4>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Montant (DH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBulletin.cnss > 0 && (
                      <tr className="border-b">
                        <td className="py-2">CNSS</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.cnss)}</td>
                      </tr>
                    )}
                    {selectedBulletin.amo > 0 && (
                      <tr className="border-b">
                        <td className="py-2">AMO</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.amo)}</td>
                      </tr>
                    )}
                    {selectedBulletin.ir > 0 && (
                      <tr className="border-b">
                        <td className="py-2">IR</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.ir)}</td>
                      </tr>
                    )}
                    {selectedBulletin.avanceSalaire > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Avance sur salaire</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.avanceSalaire)}</td>
                      </tr>
                    )}
                    {selectedBulletin.autresRetenues > 0 && (
                      <tr className="border-b">
                        <td className="py-2">Autres retenues</td>
                        <td className="text-right py-2">{formatCurrency(selectedBulletin.autresRetenues)}</td>
                      </tr>
                    )}
                    <tr className="bg-red-50 dark:bg-red-950/30 font-semibold">
                      <td className="py-2">Total Retenues</td>
                      <td className="text-right py-2 text-red-600">{formatCurrency(selectedBulletin.totalRetenues)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net à Payer */}
              <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
                <p className="text-lg">Net à Payer</p>
                <p className="text-3xl font-bold">{formatCurrency(selectedBulletin.salaireNet)}</p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Bulletin généré le {new Date(selectedBulletin.dateGeneration).toLocaleDateString('fr-FR')}
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => selectedBulletin && handleDownloadPdf(selectedBulletin.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger PDF
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowPreview(false);
                  handleEditBulletin(selectedBulletin);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le bulletin ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bulletin de paie sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BulletinsTab;
