"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  Edit,
  Trash2,
  Plus,
  Award,
  Wallet,
  Loader2,
  CreditCard,
  Shield,
  MoreHorizontal,
  Info,
  FileCheck,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate, formatRIB } from "@/lib/format";
import {
  TypeContrat,
  TypeSalaire,
  type Chauffeur,
  type Prime,
  type Avance,
} from "@/types";
import { useChauffeur, useDeleteChauffeur, usePrimes, useAvances, useCreatePrime, useCreateAvance, useUpdatePrime, useUpdateAvance, useDeletePrime, useDeleteAvance } from "@/hooks/use-queries";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { SalairesTab } from "./salaires-tab";
import { DocumentsTab } from "./documents-tab";
import { BulletinsTab } from "./bulletins-tab";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Month names in French
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// Prime Form Schema
const primeFormSchema = z.object({
  motif: z.string().min(3, "Le motif doit contenir au moins 3 caractères"),
  montant: z.coerce
    .number({
      required_error: "Le montant est requis",
      invalid_type_error: "Le montant doit être un nombre",
    })
    .positive("Le montant doit être positif"),
  date: z.string().min(1, "La date est requise"),
});

type PrimeFormValues = z.infer<typeof primeFormSchema>;

// Avance Form Schema
const avanceFormSchema = z.object({
  montant: z.coerce
    .number({
      required_error: "Le montant est requis",
      invalid_type_error: "Le montant doit être un nombre",
    })
    .positive("Le montant doit être positif"),
  date: z.string().min(1, "La date est requise"),
});

type AvanceFormValues = z.infer<typeof avanceFormSchema>;

// Props Interface
interface ChauffeurDetailsProps {
  chauffeurId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (chauffeur: Chauffeur) => void;
  onDelete?: (chauffeurId: string) => void;
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
    FIXE: "Salaire fixe",
    HORAIRE: "Salaire horaire",
    PAR_TOURNEE: "Par tournée",
  };
  return labels[type];
}

// Info Row Component
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export function ChauffeurDetails({
  chauffeurId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ChauffeurDetailsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("informations");
  
  // Prime dialogs
  const [addPrimeDialogOpen, setAddPrimeDialogOpen] = useState(false);
  const [editPrimeDialogOpen, setEditPrimeDialogOpen] = useState(false);
  const [deletePrimeDialogOpen, setDeletePrimeDialogOpen] = useState(false);
  const [selectedPrime, setSelectedPrime] = useState<Prime | null>(null);
  
  // Avance dialogs
  const [addAvanceDialogOpen, setAddAvanceDialogOpen] = useState(false);
  const [editAvanceDialogOpen, setEditAvanceDialogOpen] = useState(false);
  const [deleteAvanceDialogOpen, setDeleteAvanceDialogOpen] = useState(false);
  const [selectedAvance, setSelectedAvance] = useState<Avance | null>(null);
  
  // Chauffeur delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Attestation loading state
  const [downloadingAttestation, setDownloadingAttestation] = useState(false);

  // Queries
  const { data: chauffeur, isLoading } = useChauffeur(chauffeurId || "");
  const { data: primes } = usePrimes(chauffeurId || "");
  const { data: avances } = useAvances(chauffeurId || "");

  // Mutations
  const deleteMutation = useDeleteChauffeur();
  const createPrimeMutation = useCreatePrime();
  const updatePrimeMutation = useUpdatePrime();
  const deletePrimeMutation = useDeletePrime();
  const createAvanceMutation = useCreateAvance();
  const updateAvanceMutation = useUpdateAvance();
  const deleteAvanceMutation = useDeleteAvance();

  // Prime Form
  const primeForm = useForm<PrimeFormValues>({
    resolver: zodResolver(primeFormSchema),
    defaultValues: {
      motif: "",
      montant: 0,
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Avance Form
  const avanceForm = useForm<AvanceFormValues>({
    resolver: zodResolver(avanceFormSchema),
    defaultValues: {
      montant: 0,
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Watch dates for paid salary check
  const watchedPrimeDate = primeForm.watch("date");
  const watchedAvanceDate = avanceForm.watch("date");

  // Check if the selected month has a paid salary (for prime)
  const paidSalaryForPrimeDate = useMemo(() => {
    if (!watchedPrimeDate || !chauffeur?.salaires) return null;
    const date = new Date(watchedPrimeDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return chauffeur.salaires.find(
      s => s.mois === month && s.annee === year && s.paye
    );
  }, [watchedPrimeDate, chauffeur?.salaires]);

  // Check if the selected month has a paid salary (for avance)
  const paidSalaryForAvanceDate = useMemo(() => {
    if (!watchedAvanceDate || !chauffeur?.salaires) return null;
    const date = new Date(watchedAvanceDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return chauffeur.salaires.find(
      s => s.mois === month && s.annee === year && s.paye
    );
  }, [watchedAvanceDate, chauffeur?.salaires]);

  // Open edit prime dialog
  const openEditPrimeDialog = (prime: Prime) => {
    setSelectedPrime(prime);
    primeForm.reset({
      motif: prime.motif,
      montant: prime.montant,
      date: new Date(prime.date).toISOString().split("T")[0],
    });
    setEditPrimeDialogOpen(true);
  };

  // Open edit avance dialog
  const openEditAvanceDialog = (avance: Avance) => {
    setSelectedAvance(avance);
    avanceForm.reset({
      montant: avance.montant,
      date: new Date(avance.date).toISOString().split("T")[0],
    });
    setEditAvanceDialogOpen(true);
  };

  // Reset add prime form when dialog opens
  React.useEffect(() => {
    if (addPrimeDialogOpen) {
      primeForm.reset({
        motif: "",
        montant: 0,
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [addPrimeDialogOpen, primeForm]);

  // Reset add avance form when dialog opens
  React.useEffect(() => {
    if (addAvanceDialogOpen) {
      avanceForm.reset({
        montant: 0,
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [addAvanceDialogOpen, avanceForm]);

  // Prime handlers
  const onAddPrimeSubmit = async (values: PrimeFormValues) => {
    if (!chauffeurId) return;
    try {
      await createPrimeMutation.mutateAsync({
        chauffeurId,
        ...values,
      });
      toast({ title: "Succès", description: "Prime ajoutée avec succès" });
      setAddPrimeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout de la prime",
        variant: "destructive",
      });
    }
  };

  const onEditPrimeSubmit = async (values: PrimeFormValues) => {
    if (!chauffeurId || !selectedPrime) return;
    try {
      await updatePrimeMutation.mutateAsync({
        id: selectedPrime.id,
        chauffeurId,
        data: values,
      });
      toast({ title: "Succès", description: "Prime modifiée avec succès" });
      setEditPrimeDialogOpen(false);
      setSelectedPrime(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de la prime",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrime = async () => {
    if (!chauffeurId || !selectedPrime) return;
    try {
      await deletePrimeMutation.mutateAsync({
        id: selectedPrime.id,
        chauffeurId,
      });
      toast({ title: "Succès", description: "Prime supprimée avec succès" });
      setDeletePrimeDialogOpen(false);
      setSelectedPrime(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la prime",
        variant: "destructive",
      });
    }
  };

  // Avance handlers
  const onAddAvanceSubmit = async (values: AvanceFormValues) => {
    if (!chauffeurId) return;
    try {
      await createAvanceMutation.mutateAsync({
        chauffeurId,
        ...values,
      });
      toast({ title: "Succès", description: "Avance ajoutée avec succès" });
      setAddAvanceDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout de l'avance",
        variant: "destructive",
      });
    }
  };

  const onEditAvanceSubmit = async (values: AvanceFormValues) => {
    if (!chauffeurId || !selectedAvance) return;
    try {
      await updateAvanceMutation.mutateAsync({
        id: selectedAvance.id,
        chauffeurId,
        data: values,
      });
      toast({ title: "Succès", description: "Avance modifiée avec succès" });
      setEditAvanceDialogOpen(false);
      setSelectedAvance(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de l'avance",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAvance = async () => {
    if (!chauffeurId || !selectedAvance) return;
    try {
      await deleteAvanceMutation.mutateAsync({
        id: selectedAvance.id,
        chauffeurId,
      });
      toast({ title: "Succès", description: "Avance supprimée avec succès" });
      setDeleteAvanceDialogOpen(false);
      setSelectedAvance(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'avance",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!chauffeur) return;
    try {
      await deleteMutation.mutateAsync(chauffeur.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onDelete?.(chauffeur.id);
    } catch (error) {
      console.error("Error deleting chauffeur:", error);
    }
  };

  // Handle attestation download
  const handleDownloadAttestation = async () => {
    if (!chauffeur) return;
    
    setDownloadingAttestation(true);
    try {
      const response = await fetch(`/api/chauffeurs/${chauffeur.id}/attestation`);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Erreur lors de la génération de l\'attestation';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Response is not JSON, use status text
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      
      // Check if we actually got a PDF
      if (blob.type !== 'application/pdf' && blob.size < 100) {
        throw new Error('Le fichier généré n\'est pas un PDF valide');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attestation_Travail_${chauffeur.nom}_${chauffeur.prenom}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Succès",
        description: "Attestation de travail téléchargée avec succès",
      });
    } catch (error) {
      console.error('Attestation download error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du téléchargement de l'attestation",
        variant: "destructive",
      });
    } finally {
      setDownloadingAttestation(false);
    }
  };

  // Loading state
  if (isLoading || !chauffeur) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="sr-only">Chargement du chauffeur</SheetTitle>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Calculate stats
  const totalPrimes = (primes || []).reduce((sum, p) => sum + p.montant, 0);
  const totalAvances = (avances || []).filter((a) => !a.rembourse).reduce((sum, a) => sum + a.montant, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl">
                  {chauffeur.nom} {chauffeur.prenom}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <ContractBadge type={chauffeur.typeContrat} />
                  <Badge
                    variant="outline"
                    className={
                      chauffeur.actif
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }
                  >
                    {chauffeur.actif ? "Actif" : "Inactif"}
                  </Badge>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(chauffeur)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAttestation}
              disabled={downloadingAttestation}
            >
              {downloadingAttestation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck className="mr-2 h-4 w-4" />
              )}
              Attestation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-6"
          >
            <TabsList className="w-full justify-start">
              <TabsTrigger value="informations">
                <User className="mr-2 h-4 w-4" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="salaires">
                <DollarSign className="mr-2 h-4 w-4" />
                Salaires
              </TabsTrigger>
              <TabsTrigger value="primes">
                <Award className="mr-2 h-4 w-4" />
                Primes
              </TabsTrigger>
              <TabsTrigger value="avances">
                <Wallet className="mr-2 h-4 w-4" />
                Avances
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="bulletins">
                <FileText className="mr-2 h-4 w-4" />
                Bulletins
              </TabsTrigger>
            </TabsList>

            {/* Informations Tab */}
            <TabsContent value="informations" className="mt-4 space-y-6">
              {/* Personal Info Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow
                    icon={User}
                    label="CIN"
                    value={chauffeur.cin}
                  />
                  {chauffeur.numeroCNSS && (
                    <InfoRow
                      icon={Shield}
                      label="N° CNSS"
                      value={chauffeur.numeroCNSS}
                    />
                  )}
                  <InfoRow
                    icon={Phone}
                    label="Téléphone"
                    value={chauffeur.telephone}
                  />
                  {chauffeur.adresse && (
                    <InfoRow
                      icon={MapPin}
                      label="Adresse"
                      value={chauffeur.adresse}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Contract Info Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Informations contractuelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow
                    icon={Calendar}
                    label="Date d'embauche"
                    value={formatDate(chauffeur.dateEmbauche)}
                  />
                  <InfoRow
                    icon={FileText}
                    label="Type de contrat"
                    value={<ContractBadge type={chauffeur.typeContrat} />}
                  />
                  <InfoRow
                    icon={DollarSign}
                    label="Type de salaire"
                    value={getSalaireTypeLabel(chauffeur.typeSalaire)}
                  />
                  <InfoRow
                    icon={DollarSign}
                    label="Montant de base"
                    value={formatCurrency(chauffeur.montantSalaire)}
                  />
                  <InfoRow
                    icon={Shield}
                    label="CNSS Mensuel"
                    value={formatCurrency(chauffeur.montantCNSS || 0)}
                  />
                  <InfoRow
                    icon={Shield}
                    label="Assurance Mensuel"
                    value={formatCurrency(chauffeur.montantAssurance || 0)}
                  />
                </CardContent>
              </Card>

              {/* Banking Info Card */}
              {chauffeur.ribCompte && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Informations bancaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InfoRow
                      icon={CreditCard}
                      label="N° Compte (RIB)"
                      value={
                        <span className="font-mono tracking-wider">
                          {formatRIB(chauffeur.ribCompte)}
                        </span>
                      }
                    />
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(totalPrimes)}
                        </p>
                        <p className="text-xs text-green-600">
                          Total primes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-2xl font-bold text-amber-700">
                          {formatCurrency(totalAvances)}
                        </p>
                        <p className="text-xs text-amber-600">
                          Avances en cours
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Salaires Tab */}
            <TabsContent value="salaires" className="mt-4">
              <SalairesTab chauffeur={chauffeur} />
            </TabsContent>

            {/* Primes Tab */}
            <TabsContent value="primes" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Historique des primes</h3>
                <Button
                  size="sm"
                  onClick={() => setAddPrimeDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une prime
                </Button>
              </div>

              {primes && primes.length > 0 ? (
                <div className="space-y-2">
                  {primes.map((prime) => {
                    // Check if this prime's month has a paid salary
                    const primeDate = new Date(prime.date);
                    const primeMonth = primeDate.getMonth() + 1;
                    const primeYear = primeDate.getFullYear();
                    const isPaidSalary = chauffeur.salaires?.some(
                      s => s.mois === primeMonth && s.annee === primeYear && s.paye
                    );
                    const isLocked = prime.comptabilise || isPaidSalary;
                    
                    return (
                      <Card key={prime.id}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{prime.motif}</p>
                              {prime.comptabilise ? (
                                <Badge className="bg-blue-100 text-blue-800">
                                  Comptabilisée
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">
                                  En attente
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(prime.date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-semibold">
                              +{formatCurrency(prime.montant)}
                            </span>
                            {!isLocked && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditPrimeDialog(prime)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedPrime(prime);
                                      setDeletePrimeDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune prime enregistrée
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Avances Tab */}
            <TabsContent value="avances" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Historique des avances</h3>
                <Button
                  size="sm"
                  onClick={() => setAddAvanceDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une avance
                </Button>
              </div>

              {avances && avances.length > 0 ? (
                <div className="space-y-2">
                  {avances.map((avance) => {
                    // Check if this avance's month has a paid salary
                    const avanceDate = new Date(avance.date);
                    const avanceMonth = avanceDate.getMonth() + 1;
                    const avanceYear = avanceDate.getFullYear();
                    const isPaidSalary = chauffeur.salaires?.some(
                      s => s.mois === avanceMonth && s.annee === avanceYear && s.paye
                    );
                    const isLocked = avance.rembourse || isPaidSalary;
                    
                    return (
                      <Card key={avance.id}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-red-600">
                                {formatCurrency(avance.montant)}
                              </span>
                              {avance.rembourse ? (
                                <Badge className="bg-green-100 text-green-800">
                                  Remboursée
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800">
                                  En cours
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(avance.date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Removed "Remboursée" button - automatically handled by salary payment */}
                            {!isLocked && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditAvanceDialog(avance)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedAvance(avance);
                                      setDeleteAvanceDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune avance enregistrée
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <DocumentsTab chauffeur={chauffeur} />
            </TabsContent>

            {/* Bulletins Tab */}
            <TabsContent value="bulletins" className="mt-4">
              <BulletinsTab chauffeur={chauffeur} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Add Prime Dialog */}
      <Dialog open={addPrimeDialogOpen} onOpenChange={setAddPrimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une prime</DialogTitle>
            <DialogDescription>
              Ajouter une prime pour {chauffeur.nom} {chauffeur.prenom}
            </DialogDescription>
          </DialogHeader>

          {/* Paid Salary Warning */}
          {paidSalaryForPrimeDate && (
            <Alert className="border-red-300 bg-red-50">
              <Info className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>Attention!</strong> Le salaire de {MONTHS[paidSalaryForPrimeDate.mois - 1]} {paidSalaryForPrimeDate.annee} est déjà payé.
                <p className="text-xs mt-1">Impossible d'ajouter une prime pour un mois déjà payé.</p>
              </AlertDescription>
            </Alert>
          )}

          <Form {...primeForm}>
            <form onSubmit={primeForm.handleSubmit(onAddPrimeSubmit)} className="space-y-4">
              <FormField
                control={primeForm.control}
                name="motif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Raison de la prime..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={primeForm.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (DH) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
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
                  control={primeForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddPrimeDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createPrimeMutation.isPending || !!paidSalaryForPrimeDate}
                >
                  {createPrimeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Prime Dialog */}
      <Dialog open={editPrimeDialogOpen} onOpenChange={setEditPrimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la prime</DialogTitle>
            <DialogDescription>
              Modifier les informations de la prime
            </DialogDescription>
          </DialogHeader>
          <Form {...primeForm}>
            <form onSubmit={primeForm.handleSubmit(onEditPrimeSubmit)} className="space-y-4">
              <FormField
                control={primeForm.control}
                name="motif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Raison de la prime..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={primeForm.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (DH) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
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
                  control={primeForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditPrimeDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={updatePrimeMutation.isPending}
                >
                  {updatePrimeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Prime Dialog */}
      <AlertDialog open={deletePrimeDialogOpen} onOpenChange={setDeletePrimeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la prime ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette prime de {selectedPrime && formatCurrency(selectedPrime.montant)} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrime}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePrimeMutation.isPending}
            >
              {deletePrimeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Avance Dialog */}
      <Dialog open={addAvanceDialogOpen} onOpenChange={setAddAvanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une avance</DialogTitle>
            <DialogDescription>
              Enregistrer une avance sur salaire pour {chauffeur.nom}{" "}
              {chauffeur.prenom}
            </DialogDescription>
          </DialogHeader>

          {/* Paid Salary Warning */}
          {paidSalaryForAvanceDate && (
            <Alert className="border-red-300 bg-red-50">
              <Info className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>Attention!</strong> Le salaire de {MONTHS[paidSalaryForAvanceDate.mois - 1]} {paidSalaryForAvanceDate.annee} est déjà payé.
                <p className="text-xs mt-1">Impossible d'ajouter une avance pour un mois déjà payé.</p>
              </AlertDescription>
            </Alert>
          )}

          <Form {...avanceForm}>
            <form
              onSubmit={avanceForm.handleSubmit(onAddAvanceSubmit)}
              className="space-y-4"
            >
              <FormField
                control={avanceForm.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
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
                control={avanceForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddAvanceDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createAvanceMutation.isPending || !!paidSalaryForAvanceDate}
                >
                  {createAvanceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Avance Dialog */}
      <Dialog open={editAvanceDialogOpen} onOpenChange={setEditAvanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'avance</DialogTitle>
            <DialogDescription>
              Modifier les informations de l'avance
            </DialogDescription>
          </DialogHeader>
          <Form {...avanceForm}>
            <form
              onSubmit={avanceForm.handleSubmit(onEditAvanceSubmit)}
              className="space-y-4"
            >
              <FormField
                control={avanceForm.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
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
                control={avanceForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditAvanceDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={updateAvanceMutation.isPending}
                >
                  {updateAvanceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Avance Dialog */}
      <AlertDialog open={deleteAvanceDialogOpen} onOpenChange={setDeleteAvanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'avance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette avance de {selectedAvance && formatCurrency(selectedAvance.montant)} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAvance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAvanceMutation.isPending}
            >
              {deleteAvanceMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chauffeur Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le chauffeur{" "}
              <strong>
                {chauffeur.nom} {chauffeur.prenom}
              </strong>
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChauffeurDetails;
