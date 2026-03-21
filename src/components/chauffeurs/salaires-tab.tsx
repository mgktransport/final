"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Calculator,
  Download,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useSalaires, usePayerSalaire, useCreateSalaire, useUpdateSalaire, useDeleteSalaire, useSalairePreview } from "@/hooks/use-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { TypeSalaire, type Chauffeur, type Salaire } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

// Form Schema
const salaireFormSchema = z.object({
  mois: z.coerce.number().min(1).max(12),
  annee: z.coerce.number().min(2020).max(2100),
  heuresTravaillees: z.coerce.number().min(0).optional(),
  joursTravailles: z.coerce.number().min(0).optional(),
  montantPrimes: z.coerce.number().min(0).default(0),
  montantAvances: z.coerce.number().min(0).default(0),
});

type SalaireFormValues = z.infer<typeof salaireFormSchema>;

// Month names in French
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// Props Interface
interface SalairesTabProps {
  chauffeur: Chauffeur;
}

// Status Badge Component
function PaymentStatusBadge({ paye }: { paye: boolean }) {
  if (paye) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="mr-1 h-3 w-3" />
        Payé
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-600 border-amber-300">
      <Clock className="mr-1 h-3 w-3" />
      En attente
    </Badge>
  );
}

export function SalairesTab({ chauffeur }: SalairesTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSalaire, setSelectedSalaire] = useState<Salaire | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { toast } = useToast();

  // Queries
  const { data: salaires, isLoading } = useSalaires(chauffeur.id);
  const payerMutation = usePayerSalaire();
  const createMutation = useCreateSalaire();
  const updateMutation = useUpdateSalaire();
  const deleteMutation = useDeleteSalaire();

  // Filter salaries by year
  const filteredSalaires = useMemo(() => {
    if (!salaires) return [];
    return salaires.filter((s) => s.annee === selectedYear);
  }, [salaires, selectedYear]);

  // Form for adding
  const addForm = useForm<SalaireFormValues>({
    resolver: zodResolver(salaireFormSchema),
    defaultValues: {
      mois: new Date().getMonth() + 1,
      annee: new Date().getFullYear(),
      heuresTravaillees: 0,
      joursTravailles: 0,
      montantPrimes: 0,
      montantAvances: 0,
    },
  });

  // Form for editing
  const editForm = useForm<SalaireFormValues>({
    resolver: zodResolver(salaireFormSchema),
    defaultValues: {
      mois: 1,
      annee: new Date().getFullYear(),
      heuresTravaillees: 0,
      joursTravailles: 0,
      montantPrimes: 0,
      montantAvances: 0,
    },
  });

  // Watch mois and annee for preview (must be after form definition)
  const watchedMois = addForm.watch("mois");
  const watchedAnnee = addForm.watch("annee");

  // Get primes and avances preview for selected month
  const { data: previewData, isLoading: isLoadingPreview } = useSalairePreview(
    chauffeur.id,
    watchedMois,
    watchedAnnee
  );

  // Calculate salary for add form using preview data
  const calculateAddSalary = () => {
    const heuresTravaillees = addForm.watch("heuresTravaillees") || 0;
    const joursTravailles = addForm.watch("joursTravailles") || 0;

    let montantBase = chauffeur.montantSalaire;

    // Adjust based on salary type
    if (chauffeur.typeSalaire === TypeSalaire.HORAIRE) {
      montantBase = chauffeur.montantSalaire * heuresTravaillees;
    } else if (chauffeur.typeSalaire === TypeSalaire.PAR_TOURNEE) {
      montantBase = chauffeur.montantSalaire * joursTravailles;
    }

    // Use preview data for primes and avances
    const montantPrimes = previewData?.montantPrimes || 0;
    const montantAvances = previewData?.montantAvances || 0;

    // Calculate net to pay to chauffeur: Base + Primes - Avances
    const montantNetReel = montantBase + montantPrimes - montantAvances;
    const montantNet = Math.max(0, montantNetReel);
    const isNegative = montantNetReel < 0;

    return {
      montantBase,
      montantPrimes,
      montantAvances,
      montantNet,
      montantNetReel,
      isNegative,
    };
  };

  // Calculate salary for edit form using form values
  const calculateEditSalary = () => {
    const heuresTravaillees = editForm.watch("heuresTravaillees") || 0;
    const joursTravailles = editForm.watch("joursTravailles") || 0;
    const montantPrimes = editForm.watch("montantPrimes") || 0;
    const montantAvances = editForm.watch("montantAvances") || 0;

    let montantBase = chauffeur.montantSalaire;

    // Adjust based on salary type
    if (chauffeur.typeSalaire === TypeSalaire.HORAIRE) {
      montantBase = chauffeur.montantSalaire * heuresTravaillees;
    } else if (chauffeur.typeSalaire === TypeSalaire.PAR_TOURNEE) {
      montantBase = chauffeur.montantSalaire * joursTravailles;
    }

    // Calculate net to pay to chauffeur: Base + Primes - Avances
    const montantNetReel = montantBase + montantPrimes - montantAvances;
    const montantNet = Math.max(0, montantNetReel);
    const isNegative = montantNetReel < 0;

    return {
      montantBase,
      montantPrimes,
      montantAvances,
      montantNet,
      montantNetReel,
      isNegative,
    };
  };

  const calculatedAdd = calculateAddSalary();
  const calculatedEdit = calculateEditSalary();

  // Check if salary already exists for selected month/year
  const existingSalary = useMemo(() => {
    if (!salaires) return null;
    return salaires.find(
      (s) => s.mois === watchedMois && s.annee === watchedAnnee
    );
  }, [salaires, watchedMois, watchedAnnee]);

  // Handle mark as paid
  const handleMarkAsPaid = async (salaire: Salaire) => {
    try {
      await payerMutation.mutateAsync({ id: salaire.id, chauffeurId: chauffeur.id });
      toast({
        title: "Succès",
        description: "Salaire marqué comme payé",
      });
    } catch (error) {
      console.error("Error marking salary as paid:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du marquage du salaire",
        variant: "destructive",
      });
    }
  };

  // Handle add form submit
  const onAddSubmit = async (values: SalaireFormValues) => {
    try {
      // Don't send montantPrimes and montantAvances - let the API auto-calculate from DB
      await createMutation.mutateAsync({
        chauffeurId: chauffeur.id,
        data: {
          mois: values.mois,
          annee: values.annee,
          heuresTravaillees: values.heuresTravaillees,
          joursTravailles: values.joursTravailles,
          // montantPrimes and montantAvances are auto-calculated from DB
        },
      });
      setAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Succès",
        description: "Salaire ajouté avec succès",
      });
    } catch (error: any) {
      console.error("Error creating salary:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du salaire",
        variant: "destructive",
      });
    }
  };

  // Handle edit click
  const handleEditClick = (salaire: Salaire) => {
    setSelectedSalaire(salaire);
    editForm.reset({
      mois: salaire.mois,
      annee: salaire.annee,
      heuresTravaillees: salaire.heuresTravaillees || 0,
      joursTravailles: salaire.joursTravailles || 0,
      montantPrimes: salaire.montantPrimes,
      montantAvances: salaire.montantAvances,
    });
    setEditDialogOpen(true);
  };

  // Handle edit form submit
  const onEditSubmit = async (values: SalaireFormValues) => {
    if (!selectedSalaire) return;
    
    try {
      await updateMutation.mutateAsync({
        id: selectedSalaire.id,
        chauffeurId: chauffeur.id,
        data: {
          heuresTravaillees: values.heuresTravaillees,
          joursTravailles: values.joursTravailles,
          montantPrimes: values.montantPrimes,
          montantAvances: values.montantAvances,
        },
      });
      setEditDialogOpen(false);
      setSelectedSalaire(null);
      toast({
        title: "Succès",
        description: "Salaire modifié avec succès",
      });
    } catch (error: any) {
      console.error("Error updating salary:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification du salaire",
        variant: "destructive",
      });
    }
  };

  // Handle delete click
  const handleDeleteClick = (salaire: Salaire) => {
    setSelectedSalaire(salaire);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!selectedSalaire) return;

    try {
      await deleteMutation.mutateAsync({
        id: selectedSalaire.id,
        chauffeurId: chauffeur.id,
      });
      setDeleteDialogOpen(false);
      setSelectedSalaire(null);
      toast({
        title: "Succès",
        description: "Salaire supprimé avec succès",
      });
    } catch (error: any) {
      console.error("Error deleting salary:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression du salaire",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un salaire
        </Button>
      </div>

      {/* Salary Info Card */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Informations salariales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium">
                {chauffeur.typeSalaire === TypeSalaire.FIXE && "Fixe"}
                {chauffeur.typeSalaire === TypeSalaire.HORAIRE && "Horaire"}
                {chauffeur.typeSalaire === TypeSalaire.PAR_TOURNEE && "Par tournée"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Montant de base</p>
              <p className="font-medium">{formatCurrency(chauffeur.montantSalaire)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type de contrat</p>
              <p className="font-medium">{chauffeur.typeContrat}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date d'embauche</p>
              <p className="font-medium">{formatDate(chauffeur.dateEmbauche)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salaries Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Mois</TableHead>
              <TableHead className="font-semibold">Base</TableHead>
              <TableHead className="font-semibold">Primes</TableHead>
              <TableHead className="font-semibold">Avances</TableHead>
              <TableHead className="font-semibold">Net à payer</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSalaires.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun salaire enregistré pour {selectedYear}
                </TableCell>
              </TableRow>
            ) : (
              filteredSalaires.map((salaire) => {
                return (
                  <TableRow key={salaire.id}>
                    <TableCell className="font-medium">
                      {MONTHS[salaire.mois - 1]} {salaire.annee}
                    </TableCell>
                    <TableCell>{formatCurrency(salaire.montantBase)}</TableCell>
                    <TableCell>
                      <span className="text-green-600 font-medium">
                        +{formatCurrency(salaire.montantPrimes)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-red-600 font-medium">
                        -{formatCurrency(salaire.montantAvances)}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(salaire.montantNet)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge paye={salaire.paye} />
                    </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!salaire.paye && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(salaire)}
                            disabled={payerMutation.isPending}
                            title="Marquer comme payé"
                          >
                            {payerMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(salaire)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(salaire)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {salaire.paye && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {salaire.datePaiement && `Payé le ${formatDate(salaire.datePaiement)}`}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/api/chauffeurs/${chauffeur.id}/salaires/${salaire.id}/fiche`, '_blank')}
                            title="Imprimer la fiche de salaire"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Salary Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculer le salaire
            </DialogTitle>
            <DialogDescription>
              Calculer le salaire mensuel pour {chauffeur.nom} {chauffeur.prenom}
            </DialogDescription>
          </DialogHeader>

          {/* Existing Salary Warning */}
          {existingSalary && (
            <Alert className="border-amber-300 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Salaire existant!</strong> Un salaire pour {MONTHS[existingSalary.mois - 1]} {existingSalary.annee} a déjà été créé.
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={existingSalary.paye ? "default" : "outline"} className={existingSalary.paye ? "bg-green-100 text-green-800" : "text-amber-600 border-amber-300"}>
                    {existingSalary.paye ? "Payé" : "En attente"}
                  </Badge>
                  <span className="text-sm">Net: {formatCurrency(existingSalary.montantNet)}</span>
                </div>
                <p className="text-xs mt-2">Veuillez sélectionner un autre mois ou modifier le salaire existant.</p>
              </AlertDescription>
            </Alert>
          )}

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="mois"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mois</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONTHS.map((month, index) => (
                            <SelectItem
                              key={index}
                              value={(index + 1).toString()}
                            >
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="annee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Année</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={2020}
                          max={2100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {chauffeur.typeSalaire === TypeSalaire.HORAIRE && (
                <FormField
                  control={addForm.control}
                  name="heuresTravaillees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures travaillées</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {chauffeur.typeSalaire === TypeSalaire.PAR_TOURNEE && (
                <FormField
                  control={addForm.control}
                  name="joursTravailles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jours travaillés</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 Les primes et avances du mois sélectionné sont automatiquement calculées depuis la base de données.
              </p>

              {/* Primes and Avances Details */}
              {(previewData?.primes?.length > 0 || previewData?.avances?.length > 0) && (
                <div className="space-y-3">
                  {previewData?.primes?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-800 mb-2">
                        🎁 Primes du mois ({previewData.primes.length})
                      </p>
                      <div className="space-y-1">
                        {previewData.primes.map((p, idx) => (
                          <div key={p.id || idx} className="flex justify-between text-sm">
                            <span className="text-green-700">{p.motif}</span>
                            <span className="font-medium text-green-800">+{formatCurrency(p.montant)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {previewData?.avances?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800 mb-2">
                        💳 Avances du mois ({previewData.avances.length})
                      </p>
                      <div className="space-y-1">
                        {previewData.avances.map((a, idx) => (
                          <div key={a.id || idx} className="flex justify-between text-sm">
                            <span className="text-red-700">Avance du {formatDate(a.date)}</span>
                            <span className="font-medium text-red-800">-{formatCurrency(a.montant)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No primes or avances message */}
              {(!previewData?.primes?.length && !previewData?.avances?.length && !isLoadingPreview) && (
                <div className="bg-muted/30 border rounded-lg p-3 text-sm text-muted-foreground">
                  📋 Aucune prime ni avance non comptabilisée pour ce mois.
                </div>
              )}

              {/* Calculation Preview */}
              <Card className={`bg-primary/5 ${calculatedAdd.isNegative ? 'border-red-300 bg-red-50/50' : 'border-primary/20'}`}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Montant base:</span>
                      <span>{formatCurrency(calculatedAdd.montantBase)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Primes du mois ({previewData?.primes?.length || 0} prime{(previewData?.primes?.length || 0) > 1 ? 's' : ''}):
                      </span>
                      <span className="text-green-600">
                        {isLoadingPreview ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          `+${formatCurrency(calculatedAdd.montantPrimes)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Avances du mois ({previewData?.avances?.length || 0} avance{(previewData?.avances?.length || 0) > 1 ? 's' : ''}):
                      </span>
                      <span className="text-red-600">
                        {isLoadingPreview ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          `-${formatCurrency(calculatedAdd.montantAvances)}`
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Net à payer:</span>
                      <span className={calculatedAdd.isNegative ? "text-red-600" : "text-primary"}>
                        {isLoadingPreview ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          formatCurrency(calculatedAdd.montantNet)
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Negative Salary Warning */}
              {calculatedAdd.isNegative && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <strong>Attention!</strong> Le montant des avances ({formatCurrency(calculatedAdd.montantAvances)}) dépasse le total base + primes ({formatCurrency(calculatedAdd.montantBase + calculatedAdd.montantPrimes)}).
                    <br />
                    Le chauffeur doit rembourser: <strong>{formatCurrency(Math.abs(calculatedAdd.montantNetReel))}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createMutation.isPending || calculatedAdd.isNegative || !!existingSalary}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {createMutation.isPending ? "Enregistrement..." : "Enregistrer le salaire"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Salary Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifier le salaire
            </DialogTitle>
            <DialogDescription>
              Modifier le salaire de {selectedSalaire ? MONTHS[selectedSalaire.mois - 1] : ''} {selectedSalaire?.annee}
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              {chauffeur.typeSalaire === TypeSalaire.HORAIRE && (
                <FormField
                  control={editForm.control}
                  name="heuresTravaillees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures travaillées</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {chauffeur.typeSalaire === TypeSalaire.PAR_TOURNEE && (
                <FormField
                  control={editForm.control}
                  name="joursTravailles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jours travaillés</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="montantPrimes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primes (DH)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="montantAvances"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avances (DH)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Calculation Preview */}
              <Card className={`bg-primary/5 ${calculatedEdit.isNegative ? 'border-red-300 bg-red-50/50' : 'border-primary/20'}`}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Montant base:</span>
                      <span>{formatCurrency(calculatedEdit.montantBase)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Primes:</span>
                      <span className="text-green-600">
                        +{formatCurrency(calculatedEdit.montantPrimes)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avances:</span>
                      <span className="text-red-600">
                        -{formatCurrency(calculatedEdit.montantAvances)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Net à payer:</span>
                      <span className={calculatedEdit.isNegative ? "text-red-600" : "text-primary"}>
                        {formatCurrency(calculatedEdit.montantNet)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Negative Salary Warning */}
              {calculatedEdit.isNegative && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <strong>Attention!</strong> Le montant des avances ({formatCurrency(calculatedEdit.montantAvances)}) dépasse le total base + primes ({formatCurrency(calculatedEdit.montantBase + calculatedEdit.montantPrimes)}).
                    <br />
                    Le chauffeur doit rembourser: <strong>{formatCurrency(Math.abs(calculatedEdit.montantNetReel))}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={updateMutation.isPending || calculatedEdit.isNegative}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="mr-2 h-4 w-4" />
                  )}
                  {updateMutation.isPending ? "Modification..." : "Modifier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le salaire</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le salaire de {selectedSalaire ? MONTHS[selectedSalaire.mois - 1] : ''} {selectedSalaire?.annee} ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SalairesTab;
