"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, Download, Calculator, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import type { Chauffeur, BulletinPaie } from "@/types";

// Form schema
const bulletinFormSchema = z.object({
  chauffeurId: z.string().min(1, "Le chauffeur est requis"),
  mois: z.coerce.number().min(1).max(12),
  annee: z.coerce.number().min(2020).max(2050),
  salaireBase: z.coerce.number().min(0),
  heuresSupplementaires: z.coerce.number().min(0).default(0),
  primeTrajet: z.coerce.number().min(0).default(0),
  primeRendement: z.coerce.number().min(0).default(0),
  indemniteDeplacement: z.coerce.number().min(0).default(0),
  indemnitePanier: z.coerce.number().min(0).default(0),
  autresPrimes: z.coerce.number().min(0).default(0),
  cnss: z.coerce.number().min(0).default(0),
  amo: z.coerce.number().min(0).default(0),
  ir: z.coerce.number().min(0).default(0),
  avanceSalaire: z.coerce.number().min(0).default(0),
  autresRetenues: z.coerce.number().min(0).default(0),
});

type BulletinFormValues = z.infer<typeof bulletinFormSchema>;

interface BulletinPaieFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (bulletin: BulletinPaie) => void;
  editBulletin?: BulletinPaie | null;
}

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
];

export function BulletinPaieForm({ open, onOpenChange, onSuccess, editBulletin }: BulletinPaieFormProps) {
  const { toast } = useToast();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChauffeurs, setLoadingChauffeurs] = useState(true);
  const [selectedChauffeur, setSelectedChauffeur] = useState<Chauffeur | null>(null);
  const [generatedBulletin, setGeneratedBulletin] = useState<BulletinPaie | null>(null);
  const isEditMode = !!editBulletin;

  // Current month/year defaults
  const now = new Date();
  const currentMois = now.getMonth() + 1;
  const currentAnnee = now.getFullYear();

  const form = useForm<BulletinFormValues>({
    resolver: zodResolver(bulletinFormSchema),
    defaultValues: {
      chauffeurId: "",
      mois: currentMois,
      annee: currentAnnee,
      salaireBase: 0,
      heuresSupplementaires: 0,
      primeTrajet: 0,
      primeRendement: 0,
      indemniteDeplacement: 0,
      indemnitePanier: 0,
      autresPrimes: 0,
      cnss: 0,
      amo: 0,
      ir: 0,
      avanceSalaire: 0,
      autresRetenues: 0,
    },
  });

  // Load chauffeurs once
  useEffect(() => {
    const fetchChauffeurs = async () => {
      try {
        const response = await fetch("/api/chauffeurs?actif=true&pageSize=100");
        const data = await response.json();
        if (data.data) {
          setChauffeurs(data.data);
        }
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger les chauffeurs",
          variant: "destructive",
        });
      } finally {
        setLoadingChauffeurs(false);
      }
    };
    fetchChauffeurs();
  }, [toast]);

  // Watch for chauffeur selection and month/year changes
  const watchedChauffeurId = form.watch("chauffeurId");
  const watchedMois = form.watch("mois");
  const watchedAnnee = form.watch("annee");

  // Load chauffeur data when selected - with proper dependencies
  useEffect(() => {
    // Skip auto-loading in edit mode
    if (isEditMode) return;
    if (!watchedChauffeurId || !watchedMois || !watchedAnnee) return;

    let cancelled = false;
    
    const loadChauffeurData = async () => {
      try {
        const response = await fetch(
          `/api/bulletins-paie/preview?chauffeurId=${watchedChauffeurId}&mois=${watchedMois}&annee=${watchedAnnee}`
        );
        const result = await response.json();
        
        if (!cancelled && result.success && result.data) {
          setSelectedChauffeur(result.data);
          form.setValue("salaireBase", result.data.salaireBase || 0, { shouldValidate: false });
          form.setValue("autresPrimes", result.data.primesDuMois?.total || 0, { shouldValidate: false });
          form.setValue("avanceSalaire", result.data.avancesDuMois?.total || 0, { shouldValidate: false });
          
          if (result.data.bulletinExistant) {
            toast({
              title: "Attention",
              description: "Un bulletin existe déjà pour ce mois. La génération va le remplacer.",
              variant: "destructive",
            });
          }
        }
      } catch {
        // Ignore errors
      }
    };
    loadChauffeurData();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedChauffeurId, watchedMois, watchedAnnee, isEditMode]);

  // Calculate totals using useMemo instead of useEffect to avoid infinite loops
  const salaireBase = form.watch("salaireBase");
  const heuresSupplementaires = form.watch("heuresSupplementaires");
  const primeTrajet = form.watch("primeTrajet");
  const primeRendement = form.watch("primeRendement");
  const indemniteDeplacement = form.watch("indemniteDeplacement");
  const indemnitePanier = form.watch("indemnitePanier");
  const autresPrimes = form.watch("autresPrimes");
  const cnss = form.watch("cnss");
  const amo = form.watch("amo");
  const ir = form.watch("ir");
  const avanceSalaire = form.watch("avanceSalaire");
  const autresRetenues = form.watch("autresRetenues");

  const previewData = useMemo(() => {
    const salaireBrut = 
      (salaireBase || 0) +
      (heuresSupplementaires || 0) +
      (primeTrajet || 0) +
      (primeRendement || 0) +
      (indemniteDeplacement || 0) +
      (indemnitePanier || 0) +
      (autresPrimes || 0);

    const totalRetenues = 
      (cnss || 0) +
      (amo || 0) +
      (ir || 0) +
      (avanceSalaire || 0) +
      (autresRetenues || 0);

    const salaireNet = salaireBrut - totalRetenues;

    return {
      salaireBrut,
      totalRetenues,
      salaireNet,
    };
  }, [salaireBase, heuresSupplementaires, primeTrajet, primeRendement, indemniteDeplacement, indemnitePanier, autresPrimes, cnss, amo, ir, avanceSalaire, autresRetenues]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editBulletin) {
        // Mode édition - remplir le formulaire avec les données existantes
        form.reset({
          chauffeurId: editBulletin.chauffeurId,
          mois: editBulletin.mois,
          annee: editBulletin.annee,
          salaireBase: editBulletin.salaireBase,
          heuresSupplementaires: editBulletin.heuresSupplementaires,
          primeTrajet: editBulletin.primeTrajet,
          primeRendement: editBulletin.primeRendement,
          indemniteDeplacement: editBulletin.indemniteDeplacement,
          indemnitePanier: editBulletin.indemnitePanier,
          autresPrimes: editBulletin.autresPrimes,
          cnss: editBulletin.cnss,
          amo: editBulletin.amo,
          ir: editBulletin.ir,
          avanceSalaire: editBulletin.avanceSalaire,
          autresRetenues: editBulletin.autresRetenues,
        });
        // Charger les infos du chauffeur
        if (editBulletin.chauffeur) {
          setSelectedChauffeur(editBulletin.chauffeur as Chauffeur);
        }
      } else {
        // Mode création
        form.reset({
          chauffeurId: "",
          mois: currentMois,
          annee: currentAnnee,
          salaireBase: 0,
          heuresSupplementaires: 0,
          primeTrajet: 0,
          primeRendement: 0,
          indemniteDeplacement: 0,
          indemnitePanier: 0,
          autresPrimes: 0,
          cnss: 0,
          amo: 0,
          ir: 0,
          avanceSalaire: 0,
          autresRetenues: 0,
        });
        setSelectedChauffeur(null);
      }
      setGeneratedBulletin(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editBulletin]);

  const onSubmit = async (values: BulletinFormValues) => {
    setLoading(true);
    try {
      let response;
      
      if (isEditMode && editBulletin) {
        // Mode édition - utiliser PUT
        response = await fetch(`/api/bulletins-paie/${editBulletin.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      } else {
        // Mode création
        response = await fetch("/api/bulletins-paie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      }
      
      const result = await response.json();
      
      if (result.success) {
        setGeneratedBulletin(result.data);
        toast({
          title: "Succès",
          description: isEditMode 
            ? "Bulletin de paie modifié avec succès"
            : "Bulletin de paie généré avec succès",
        });
        onSuccess?.(result.data);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la génération du bulletin",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du bulletin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedBulletin) return;
    
    try {
      const response = await fetch(`/api/bulletins-paie/${generatedBulletin.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulletin_${moisOptions.find(m => m.value === generatedBulletin.mois.toString())?.label}_${generatedBulletin.annee}_${selectedChauffeur?.nom || 'employe'}.pdf`;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? "Modifier le Bulletin de Paie" : "Bulletin de Paie Chauffeur"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Modifiez les informations du bulletin de paie"
              : "Générez un bulletin de paie pour un chauffeur"}
          </DialogDescription>
        </DialogHeader>

        {!generatedBulletin ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Selection Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {isEditMode ? "Modifier le bulletin" : "Sélection"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Chauffeur *</Label>
                    <Select
                      value={form.watch("chauffeurId")}
                      onValueChange={(value) => form.setValue("chauffeurId", value)}
                      disabled={isEditMode}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un chauffeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingChauffeurs ? (
                          <SelectItem value="_loading" disabled>Chargement...</SelectItem>
                        ) : (
                          chauffeurs.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nom} {c.prenom}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mois *</Label>
                    <Select
                      value={form.watch("mois").toString()}
                      onValueChange={(value) => form.setValue("mois", parseInt(value))}
                      disabled={isEditMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {moisOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Année *</Label>
                    <Input
                      type="number"
                      {...form.register("annee")}
                      min={2020}
                      max={2050}
                      disabled={isEditMode}
                    />
                  </div>
                </div>
                
                {/* Chauffeur Info */}
                {selectedChauffeur && (
                  <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>CIN:</strong> {selectedChauffeur.cin}</div>
                      <div><strong>N°CNSS:</strong> {selectedChauffeur.numeroCNSS || "-"}</div>
                      <div><strong>Téléphone:</strong> {selectedChauffeur.telephone}</div>
                      <div><strong>Poste:</strong> Chauffeur</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gains Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Éléments de Salaire (Gains)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Salaire de base (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("salaireBase")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heures supplémentaires (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("heuresSupplementaires")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prime de trajet (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("primeTrajet")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prime de rendement (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("primeRendement")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Indemnité de déplacement (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("indemniteDeplacement")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Indemnité panier (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("indemnitePanier")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autres primes (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("autresPrimes")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Retenues Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Retenues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>CNSS (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("cnss")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AMO (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("amo")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IR - Impôt sur le revenu (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("ir")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avance sur salaire (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("avanceSalaire")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autres retenues (DH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("autresRetenues")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Section */}
            {previewData && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Calcul Automatique</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Salaire Brut:</span>
                      <span className="font-semibold">{formatCurrency(previewData.salaireBrut)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Total Retenues:</span>
                      <span className="font-semibold">- {formatCurrency(previewData.totalRetenues)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-bold text-primary">
                      <span>Salaire Net à Payer:</span>
                      <span>{formatCurrency(previewData.salaireNet)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Modification..." : "Génération..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier le bulletin
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Générer le bulletin
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Generated Bulletin Preview */
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
            
            <BulletinPreview bulletin={generatedBulletin} chauffeur={selectedChauffeur} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Bulletin Preview Component
function BulletinPreview({ bulletin, chauffeur }: { bulletin: BulletinPaie; chauffeur: Chauffeur | null }) {
  const moisLabel = moisOptions.find(m => m.value === bulletin.mois.toString())?.label || "";
  
  return (
    <Card className="print:shadow-none print:border-0" id="bulletin-paie">
      <CardHeader className="text-center border-b pb-4">
        <CardTitle className="text-xl">BULLETIN DE PAIE</CardTitle>
        <CardDescription>
          {moisLabel} {bulletin.annee}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Chauffeur Info */}
        {chauffeur && (
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
        )}
        
        {/* Gains Table */}
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
                <td className="text-right py-2">{formatCurrency(bulletin.salaireBase)}</td>
              </tr>
              {bulletin.heuresSupplementaires > 0 && (
                <tr className="border-b">
                  <td className="py-2">Heures supplémentaires</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.heuresSupplementaires)}</td>
                </tr>
              )}
              {bulletin.primeTrajet > 0 && (
                <tr className="border-b">
                  <td className="py-2">Prime de trajet</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.primeTrajet)}</td>
                </tr>
              )}
              {bulletin.primeRendement > 0 && (
                <tr className="border-b">
                  <td className="py-2">Prime de rendement</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.primeRendement)}</td>
                </tr>
              )}
              {bulletin.indemniteDeplacement > 0 && (
                <tr className="border-b">
                  <td className="py-2">Indemnité de déplacement</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.indemniteDeplacement)}</td>
                </tr>
              )}
              {bulletin.indemnitePanier > 0 && (
                <tr className="border-b">
                  <td className="py-2">Indemnité panier</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.indemnitePanier)}</td>
                </tr>
              )}
              {bulletin.autresPrimes > 0 && (
                <tr className="border-b">
                  <td className="py-2">Autres primes</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.autresPrimes)}</td>
                </tr>
              )}
              <tr className="bg-muted font-semibold">
                <td className="py-2">Salaire Brut</td>
                <td className="text-right py-2">{formatCurrency(bulletin.salaireBrut)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Retenues Table */}
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
              {bulletin.cnss > 0 && (
                <tr className="border-b">
                  <td className="py-2">CNSS</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.cnss)}</td>
                </tr>
              )}
              {bulletin.amo > 0 && (
                <tr className="border-b">
                  <td className="py-2">AMO</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.amo)}</td>
                </tr>
              )}
              {bulletin.ir > 0 && (
                <tr className="border-b">
                  <td className="py-2">IR</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.ir)}</td>
                </tr>
              )}
              {bulletin.avanceSalaire > 0 && (
                <tr className="border-b">
                  <td className="py-2">Avance sur salaire</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.avanceSalaire)}</td>
                </tr>
              )}
              {bulletin.autresRetenues > 0 && (
                <tr className="border-b">
                  <td className="py-2">Autres retenues</td>
                  <td className="text-right py-2">{formatCurrency(bulletin.autresRetenues)}</td>
                </tr>
              )}
              <tr className="bg-red-50 dark:bg-red-950/30 font-semibold">
                <td className="py-2">Total Retenues</td>
                <td className="text-right py-2 text-red-600">{formatCurrency(bulletin.totalRetenues)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Net à Payer */}
        <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
          <p className="text-lg">Net à Payer</p>
          <p className="text-3xl font-bold">{formatCurrency(bulletin.salaireNet)}</p>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Bulletin généré le {new Date(bulletin.dateGeneration).toLocaleDateString('fr-FR')}
        </p>
      </CardContent>
    </Card>
  );
}

export default BulletinPaieForm;
