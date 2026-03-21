"use client";

import * as React from "react";
import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Loader2,
  X,
  Pencil,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { TypeDocumentVehicule, type Vehicule, type DocumentVehicule } from "@/types";
import { useCreateDocumentVehicule, useUpdateDocumentVehicule, useTypesDocuments } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

// Form Schema
const documentFormSchema = z.object({
  type: z.string().min(1, "Veuillez sélectionner un type de document"),
  numero: z.string().optional(),
  dateEmission: z.string().optional(),
  dateExpiration: z.string({
    required_error: "La date d'expiration est obligatoire",
  }).min(1, "La date d'expiration est obligatoire"),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

// Predefined Document Types for Vehicles
const PREDEFINED_TYPES: Record<string, { label: string; icon: string }> = {
  [TypeDocumentVehicule.ASSURANCE]: { label: "Assurance", icon: "🛡️" },
  [TypeDocumentVehicule.VISITE_TECHNIQUE]: { label: "Visite technique", icon: "🔧" },
  [TypeDocumentVehicule.CARTE_GRISE]: { label: "Carte grise", icon: "📋" },
};

// Props Interface
interface DocumentVehiculeFormProps {
  vehicule: Vehicule;
  document?: DocumentVehicule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DocumentVehiculeForm({
  vehicule,
  document,
  open,
  onOpenChange,
  onSuccess,
}: DocumentVehiculeFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeCurrentFile, setRemoveCurrentFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isEditMode = !!document;

  // Fetch custom document types for vehicles
  const { data: customTypes = [] } = useTypesDocuments('VEHICULE');

  // Combine predefined and custom types
  const allDocumentTypes = React.useMemo(() => {
    const types: Record<string, { label: string; icon: string }> = { ...PREDEFINED_TYPES };
    
    // Add custom types
    customTypes.forEach((type) => {
      if (type.actif) {
        types[type.code] = { 
          label: type.nom, 
          icon: "📄" 
        };
      }
    });
    
    return types;
  }, [customTypes]);

  // Mutations
  const createMutation = useCreateDocumentVehicule();
  const updateMutation = useUpdateDocumentVehicule();

  // Form
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      type: "",
      numero: "",
      dateEmission: "",
      dateExpiration: "",
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      if (document) {
        form.reset({
          type: document.type,
          numero: document.numero || "",
          dateEmission: document.dateEmission ? new Date(document.dateEmission).toISOString().split('T')[0] : "",
          dateExpiration: document.dateExpiration ? new Date(document.dateExpiration).toISOString().split('T')[0] : "",
        });
      } else {
        form.reset({
          type: "",
          numero: "",
          dateEmission: "",
          dateExpiration: "",
        });
      }
      setSelectedFile(null);
      setRemoveCurrentFile(false);
    }
  }, [open, document, form]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "Le fichier ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Erreur",
          description: "Type de fichier non autorisé (PDF, JPG, PNG uniquement)",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setRemoveCurrentFile(false);
    }
  };

  // Submit handler
  const onSubmit = async (values: DocumentFormValues) => {
    const formData = new FormData();
    formData.append('type', values.type);
    if (values.numero) formData.append('numero', values.numero);
    if (values.dateEmission) formData.append('dateEmission', values.dateEmission);
    formData.append('dateExpiration', values.dateExpiration);
    if (selectedFile) formData.append('file', selectedFile);
    if (removeCurrentFile) formData.append('removeFile', 'true');

    try {
      if (isEditMode && document) {
        await updateMutation.mutateAsync({
          id: document.id,
          vehiculeId: vehicule.id,
          data: formData,
        });
        toast({
          title: "Succès",
          description: "Document modifié avec succès",
        });
      } else {
        await createMutation.mutateAsync({
          vehiculeId: vehicule.id,
          data: formData,
        });
        toast({
          title: "Succès",
          description: "Document ajouté avec succès",
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'enregistrement du document",
        variant: "destructive",
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Pencil className="h-5 w-5 text-[#0066cc]" />
                Modifier le document
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-[#0066cc]" />
                Ajouter un document
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modifiez les informations du document pour ${vehicule.immatriculation}`
              : `Ajoutez un document pour le véhicule ${vehicule.immatriculation}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de document *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Predefined types */}
                      <SelectItem value={TypeDocumentVehicule.ASSURANCE}>
                        🛡️ Assurance
                      </SelectItem>
                      <SelectItem value={TypeDocumentVehicule.VISITE_TECHNIQUE}>
                        🔧 Visite technique
                      </SelectItem>
                      <SelectItem value={TypeDocumentVehicule.CARTE_GRISE}>
                        📋 Carte grise
                      </SelectItem>
                      {/* Custom types */}
                      {customTypes.filter(t => t.actif).map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          📄 {type.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Number */}
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro du document</FormLabel>
                  <FormControl>
                    <Input placeholder="N° du document" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateEmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'émission</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateExpiration"
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

            {/* Current File Display (Edit Mode) */}
            {isEditMode && document?.fichier && !removeCurrentFile && (
              <div className="space-y-2">
                <FormLabel>Fichier actuel</FormLabel>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm flex-1">Document téléchargé</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveCurrentFile(true)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>
                {isEditMode && document?.fichier && !removeCurrentFile
                  ? "Remplacer le fichier"
                  : "Fichier (optionnel)"}
              </FormLabel>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Glissez un fichier ici ou cliquez pour parcourir
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG jusqu'à 5MB
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#0066cc] hover:bg-[#0052a3]"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Modifier" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentVehiculeForm;
