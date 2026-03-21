"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload, FileText, X, AlertCircle } from "lucide-react";
import {
  useCreateChauffeur,
  useUpdateChauffeur,
  useCreateChauffeurWithFile,
} from "@/hooks/use-queries";
import { TypeContrat, TypeSalaire, type Chauffeur } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RIBInput } from "@/components/ui/rib-input";
import { getTodayDateString, getDateInputValue } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";

// Form Schema with Zod
const chauffeurFormSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  cin: z.string().min(5, "CIN invalide").max(20, "CIN invalide"),
  telephone: z.string().min(10, "Numéro de téléphone invalide"),
  adresse: z.string().optional(),
  numeroCNSS: z.string()
    .min(8, "Le N°CNSS doit contenir au moins 8 chiffres")
    .max(12, "Le N°CNSS ne peut pas dépasser 12 chiffres")
    .regex(/^[0-9]+$/, "Le N°CNSS doit contenir uniquement des chiffres")
    .optional()
    .or(z.literal("")),
  dateEmbauche: z.string().min(1, "La date d'embauche est requise"),
  dateFinContrat: z.string().optional(), // Pour CDD
  typeContrat: z.nativeEnum(TypeContrat, {
    errorMap: () => ({ message: "Veuillez sélectionner un type de contrat" }),
  }),
  typeSalaire: z.nativeEnum(TypeSalaire, {
    errorMap: () => ({ message: "Veuillez sélectionner un type de salaire" }),
  }),
  montantSalaire: z.coerce
    .number({
      required_error: "Le montant du salaire est requis",
      invalid_type_error: "Le montant doit être un nombre",
    })
    .positive("Le montant doit être positif"),
  montantCNSS: z.coerce
    .number({
      invalid_type_error: "Le montant doit être un nombre",
    })
    .min(0, "Le montant ne peut pas être négatif")
    .default(0),
  montantAssurance: z.coerce
    .number({
      invalid_type_error: "Le montant doit être un nombre",
    })
    .min(0, "Le montant ne peut pas être négatif")
    .default(0),
  ribCompte: z.string()
    .length(24, "Le RIB doit contenir exactement 24 chiffres")
    .regex(/^\d{24}$/, "Le RIB doit contenir uniquement des chiffres")
    .optional()
    .or(z.literal("")),
  actif: z.boolean().default(true),
  // Permis de conduire obligatoire
  permisNumero: z.string().min(1, "Le numéro du permis est obligatoire"),
  permisDateExpiration: z.string().min(1, "La date d'expiration du permis est obligatoire"),
}).refine((data) => {
  // Si le contrat est CDD, la date de fin est obligatoire
  if (data.typeContrat === TypeContrat.CDD && !data.dateFinContrat) {
    return false;
  }
  return true;
}, {
  message: "La date de fin de contrat est obligatoire pour un CDD",
  path: ["dateFinContrat"],
});

type ChauffeurFormValues = z.infer<typeof chauffeurFormSchema>;

// Props Interface
interface ChauffeurFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chauffeur?: Chauffeur | null; // For edit mode
  onSuccess?: (chauffeur: Chauffeur) => void;
}

export function ChauffeurForm({
  open,
  onOpenChange,
  chauffeur,
  onSuccess,
}: ChauffeurFormProps) {
  const isEditMode = !!chauffeur;
  const [permisFile, setPermisFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const createMutation = useCreateChauffeurWithFile();
  const updateMutation = useUpdateChauffeur();
  const { toast } = useToast();

  // Form initialization
  const form = useForm<ChauffeurFormValues>({
    resolver: zodResolver(chauffeurFormSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      cin: "",
      telephone: "",
      adresse: "",
      numeroCNSS: "",
      dateEmbauche: getTodayDateString(),
      dateFinContrat: "",
      typeContrat: TypeContrat.CDI,
      typeSalaire: TypeSalaire.FIXE,
      montantSalaire: 0,
      montantCNSS: 0,
      montantAssurance: 0,
      ribCompte: "",
      actif: true,
      permisNumero: "",
      permisDateExpiration: "",
    },
  });

  // Watch typeContrat to conditionally show dateFinContrat
  const watchedTypeContrat = form.watch("typeContrat");

  // Reset form when dialog opens/closes or chauffeur changes
  useEffect(() => {
    if (open) {
      if (chauffeur) {
        // Edit mode - populate form
        // Find permis document if exists
        const permisDoc = chauffeur.documents?.find(d => d.type === 'PERMIS_CONDUIRE');
        
        form.reset({
          nom: chauffeur.nom,
          prenom: chauffeur.prenom,
          cin: chauffeur.cin,
          telephone: chauffeur.telephone,
          adresse: chauffeur.adresse || "",
          numeroCNSS: chauffeur.numeroCNSS || "",
          dateEmbauche: getDateInputValue(chauffeur.dateEmbauche),
          dateFinContrat: chauffeur.dateFinContrat 
            ? getDateInputValue(chauffeur.dateFinContrat) 
            : "",
          typeContrat: chauffeur.typeContrat,
          typeSalaire: chauffeur.typeSalaire,
          montantSalaire: chauffeur.montantSalaire,
          montantCNSS: chauffeur.montantCNSS || 0,
          montantAssurance: chauffeur.montantAssurance || 0,
          ribCompte: chauffeur.ribCompte || "",
          actif: chauffeur.actif,
          permisNumero: permisDoc?.numero || "",
          permisDateExpiration: permisDoc?.dateExpiration 
            ? getDateInputValue(permisDoc.dateExpiration) 
            : "",
        });
      } else {
        // Create mode - reset to defaults
        form.reset({
          nom: "",
          prenom: "",
          cin: "",
          telephone: "",
          adresse: "",
          numeroCNSS: "",
          dateEmbauche: getTodayDateString(),
          dateFinContrat: "",
          typeContrat: TypeContrat.CDI,
          typeSalaire: TypeSalaire.FIXE,
          montantSalaire: 0,
          montantCNSS: 0,
          montantAssurance: 0,
          ribCompte: "",
          actif: true,
          permisNumero: "",
          permisDateExpiration: "",
        });
      }
    }
  }, [open, chauffeur, form]);
  
  // Clear file when dialog closes
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setPermisFile(null);
    }
    onOpenChange(open);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        form.setError("permisNumero", { message: "Le fichier ne doit pas dépasser 5MB" });
        return;
      }
      setPermisFile(file);
    }
  };

  // Submit handler
  const onSubmit = async (values: ChauffeurFormValues) => {
    try {
      if (isEditMode && chauffeur) {
        // Update existing chauffeur
        const result = await updateMutation.mutateAsync({
          id: chauffeur.id,
          data: values,
        });
        if (result.success && result.data) {
          onSuccess?.(result.data);
          onOpenChange(false);
        }
      } else {
        // Create new chauffeur with permis - use FormData
        const formData = new FormData();
        
        // Add chauffeur data
        formData.append('nom', values.nom);
        formData.append('prenom', values.prenom);
        formData.append('cin', values.cin);
        formData.append('telephone', values.telephone);
        formData.append('adresse', values.adresse || '');
        formData.append('numeroCNSS', values.numeroCNSS || '');
        formData.append('dateEmbauche', values.dateEmbauche);
        formData.append('dateFinContrat', values.dateFinContrat || '');
        formData.append('typeContrat', values.typeContrat);
        formData.append('typeSalaire', values.typeSalaire);
        formData.append('montantSalaire', String(values.montantSalaire));
        formData.append('montantCNSS', String(values.montantCNSS));
        formData.append('montantAssurance', String(values.montantAssurance));
        formData.append('ribCompte', values.ribCompte || '');
        formData.append('actif', String(values.actif));
        
        // Add permis data
        formData.append('permisNumero', values.permisNumero);
        formData.append('permisDateExpiration', values.permisDateExpiration);
        
        // Add file if selected
        if (permisFile) {
          formData.append('permisFile', permisFile);
        }

        const result = await createMutation.mutateAsync(formData);
        if (result.success && result.data) {
          onSuccess?.(result.data);
          onOpenChange(false);
        }
      }
    } catch (error: unknown) {
      // Afficher le message d'erreur via toast
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Erreur lors de l'enregistrement du chauffeur";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifier le chauffeur" : "Ajouter un chauffeur"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations du chauffeur ci-dessous."
              : "Remplissez les informations pour ajouter un nouveau chauffeur."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="DUPONT"
                        {...field}
                        onChange={(e) => {
                          // Convert to uppercase
                          const value = e.target.value.toUpperCase();
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="JEAN"
                        {...field}
                        onChange={(e) => {
                          // Convert to uppercase
                          const value = e.target.value.toUpperCase();
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CIN and Telephone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CIN *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="AB123456"
                        maxLength={20}
                        {...field}
                        onChange={(e) => {
                          // Only uppercase letters and numbers
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Lettres majuscules et chiffres uniquement
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0612345678"
                        maxLength={15}
                        {...field}
                        onChange={(e) => {
                          // Only digits
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Chiffres uniquement
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <FormField
              control={form.control}
              name="adresse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Rue Example, Ville"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* N° CNSS */}
            <FormField
              control={form.control}
              name="numeroCNSS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° CNSS</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12345678"
                      maxLength={12}
                      {...field}
                      onChange={(e) => {
                        // Only digits
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Numéro d'immatriculation CNSS (8 à 12 chiffres)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Contract Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dateEmbauche"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'embauche *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="typeContrat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de contrat *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset dateFinContrat if not CDD
                        if (value !== TypeContrat.CDD) {
                          form.setValue("dateFinContrat", "");
                        }
                      }}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TypeContrat.CDI}>
                          CDI (Contrat à durée indéterminée)
                        </SelectItem>
                        <SelectItem value={TypeContrat.CDD}>
                          CDD (Contrat à durée déterminée)
                        </SelectItem>
                        <SelectItem value={TypeContrat.JOURNALIER}>
                          Journalier
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date fin de contrat - Only for CDD */}
            {watchedTypeContrat === TypeContrat.CDD && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700">
                  <strong>Contrat CDD détecté!</strong> Veuillez spécifier la date de fin de contrat.
                  Une alerte automatique sera créée 30 jours avant cette date.
                </AlertDescription>
              </Alert>
            )}

            {watchedTypeContrat === TypeContrat.CDD && (
              <FormField
                control={form.control}
                name="dateFinContrat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin de contrat *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Une alerte sera créée automatiquement 30 jours avant la fin du contrat
                    </p>
                  </FormItem>
                )}
              />
            )}

            {/* Salary Type and Amount */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="typeSalaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de salaire *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TypeSalaire.FIXE}>
                          Salaire fixe
                        </SelectItem>
                        <SelectItem value={TypeSalaire.HORAIRE}>
                          Salaire horaire
                        </SelectItem>
                        <SelectItem value={TypeSalaire.PAR_TOURNEE}>
                          Par tournée
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="montantSalaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="5000"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? "" : parseFloat(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CNSS and Assurance */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="montantCNSS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant CNSS Mensuel (DH)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? "" : parseFloat(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="montantAssurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant Assurance Mensuel (DH)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? "" : parseFloat(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* RIB Compte Bancaire */}
            <FormField
              control={form.control}
              name="ribCompte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Compte Bancaire (RIB 24 chiffres)</FormLabel>
                  <FormControl>
                    <RIBInput
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Format: 011 780 0000123456789012 34
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permis de conduire - OBLIGATOIRE */}
            {!isEditMode && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-lg">Permis de conduire (Obligatoire)</h3>
                </div>
                <Alert className="mb-4 bg-orange-50 border-orange-200">
                  <AlertDescription className="text-sm">
                    Le permis de conduire est obligatoire pour chaque chauffeur. 
                    Veuillez saisir les informations du permis ci-dessous.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="permisNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° Permis de conduire *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="A123456"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="permisDateExpiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'expiration *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* File Upload for Permis */}
                <div className="mt-4 space-y-2">
                  <FormLabel>Fichier du permis (optionnel)</FormLabel>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {permisFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{permisFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPermisFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Télécharger le permis (PDF, JPG, PNG)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max 5MB
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Parcourir
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Status */}
            <FormField
              control={form.control}
              name="actif"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Chauffeur actif</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Décochez si le chauffeur n'est plus en service
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Modification..." : "Ajout..."}
                  </>
                ) : isEditMode ? (
                  "Modifier"
                ) : (
                  "Ajouter"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ChauffeurForm;
