"use client";

import * as React from "react";
import { useState, useMemo, useRef } from "react";
import {
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  ExternalLink,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { TypeDocumentChauffeur, type Chauffeur, type DocumentChauffeur } from "@/types";
import { useCreateDocument, useDeleteDocument, useUpdateDocument, useTypesDocuments } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

// Form Schema
const documentFormSchema = z.object({
  type: z.string().min(1, "Veuillez sélectionner un type de document"),
  numero: z.string().optional(),
  dateExpiration: z.string({
    required_error: "La date d'expiration est obligatoire",
  }).min(1, "La date d'expiration est obligatoire"),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

// Predefined Document Types
const PREDEFINED_TYPES: Record<string, { label: string; icon: string }> = {
  [TypeDocumentChauffeur.PERMIS_CONDUIRE]: { label: "Permis de conduire", icon: "🪪" },
  [TypeDocumentChauffeur.ASSURANCE_CHAUFFEUR]: { label: "Assurance chauffeur", icon: "🛡️" },
  [TypeDocumentChauffeur.VISITE_MEDICALE]: { label: "Visite médicale", icon: "🏥" },
  [TypeDocumentChauffeur.CIN]: { label: "Carte d'identité nationale", icon: "🪪" },
};

// Props Interface
interface DocumentsTabProps {
  chauffeur: Chauffeur;
}

// Expiration Status Component
function ExpirationStatus({ dateExpiration }: { dateExpiration: Date | string | null }) {
  if (!dateExpiration) {
    return (
      <Badge variant="outline" className="text-gray-500">
        Non définie
      </Badge>
    );
  }

  const expiration = new Date(dateExpiration);
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 0) {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Expiré
      </Badge>
    );
  }

  if (daysUntilExpiration <= 30) {
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <Clock className="mr-1 h-3 w-3" />
        Expire dans {daysUntilExpiration}j
      </Badge>
    );
  }

  if (daysUntilExpiration <= 90) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <Clock className="mr-1 h-3 w-3" />
        Expire dans {daysUntilExpiration}j
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      <CheckCircle className="mr-1 h-3 w-3" />
      Valide
    </Badge>
  );
}

// Helper function to get file URL (use API route for reliable access)
function getFileUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  // If the path starts with /uploads, convert to API route
  if (filePath.startsWith('/uploads/')) {
    return '/api/files/' + filePath.substring('/uploads/'.length);
  }
  return filePath;
}

// Document Card Component
function DocumentCard({
  doc,
  documentTypes,
  onEdit,
  onDelete,
}: {
  doc: DocumentChauffeur;
  documentTypes: Record<string, { label: string; icon: string }>;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const typeInfo = documentTypes[doc.type] || { label: doc.type, icon: "📄" };
  const fileUrl = getFileUrl(doc.fichier);

  return (
    <Card className="relative overflow-hidden">
      {/* Expiration indicator stripe */}
      {doc.dateExpiration && (
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            new Date(doc.dateExpiration) < new Date()
              ? "bg-red-500"
              : Math.ceil(
                  (new Date(doc.dateExpiration).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                ) <= 30
              ? "bg-orange-500"
              : "bg-green-500"
          }`}
        />
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div>
              <CardTitle className="text-base">
                {typeInfo.label}
              </CardTitle>
              {doc.numero && (
                <CardDescription className="text-xs">
                  N° {doc.numero}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {fileUrl && (
                <DropdownMenuItem asChild>
                  <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {doc.dateExpiration && (
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Expire le</p>
            <p className="font-medium">{formatDate(doc.dateExpiration)}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <ExpirationStatus dateExpiration={doc.dateExpiration} />
          {fileUrl && (
            <Button variant="outline" size="sm" className="h-7" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                Voir
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentsTab({ chauffeur }: DocumentsTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<DocumentChauffeur | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentChauffeur | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeCurrentFile, setRemoveCurrentFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get documents from chauffeur
  const documents = chauffeur.documents || [];

  // Fetch custom document types
  const { data: customTypes = [] } = useTypesDocuments('CHAUFFEUR');

  // Combine predefined and custom types
  const allDocumentTypes = useMemo(() => {
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
  const createDocumentMutation = useCreateDocument();
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  // Sort documents by expiration date (expired and expiring soon first)
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      // Documents without expiration go last
      if (!a.dateExpiration) return 1;
      if (!b.dateExpiration) return -1;

      const dateA = new Date(a.dateExpiration).getTime();
      const dateB = new Date(b.dateExpiration).getTime();
      return dateA - dateB;
    });
  }, [documents]);

  // Add Form
  const addForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      type: "",
      numero: "",
      dateExpiration: "",
    },
  });

  // Watch type field for duplicate check
  const watchedType = addForm.watch("type");

  // Check if document type already exists
  const existingDocOfType = useMemo(() => {
    if (!watchedType) return null;
    return documents.find(doc => doc.type === watchedType);
  }, [documents, watchedType]);

  // Edit Form
  const editForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      type: "",
      numero: "",
      dateExpiration: "",
    },
  });

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: documents.length,
      expired: documents.filter(
        (d) => d.dateExpiration && new Date(d.dateExpiration) < now
      ).length,
      expiringSoon: documents.filter((d) => {
        if (!d.dateExpiration) return false;
        const days = Math.ceil(
          (new Date(d.dateExpiration).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return days > 0 && days <= 30;
      }).length,
      valid: documents.filter((d) => {
        if (!d.dateExpiration) return false;
        const days = Math.ceil(
          (new Date(d.dateExpiration).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return days > 30;
      }).length,
    };
  }, [documents]);

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
      setSelectedFile(file);
      setRemoveCurrentFile(false);
    }
  };

  // Handle add form submit
  const onAddSubmit = async (values: DocumentFormValues) => {
    const formData = new FormData();
    formData.append('type', values.type);
    if (values.numero) formData.append('numero', values.numero);
    if (values.dateExpiration) formData.append('dateExpiration', values.dateExpiration);
    if (selectedFile) formData.append('file', selectedFile);

    try {
      await createDocumentMutation.mutateAsync({
        chauffeurId: chauffeur.id,
        data: formData,
      });
      toast({
        title: "Succès",
        description: "Document ajouté avec succès",
      });
      setAddDialogOpen(false);
      addForm.reset();
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'ajout du document",
        variant: "destructive",
      });
    }
  };

  // Handle edit form submit
  const onEditSubmit = async (values: DocumentFormValues) => {
    if (!documentToEdit) return;

    const formData = new FormData();
    formData.append('type', values.type);
    if (values.numero) formData.append('numero', values.numero);
    if (values.dateExpiration) formData.append('dateExpiration', values.dateExpiration);
    if (selectedFile) formData.append('file', selectedFile);
    if (removeCurrentFile) formData.append('removeFile', 'true');

    try {
      await updateDocumentMutation.mutateAsync({
        id: documentToEdit.id,
        chauffeurId: chauffeur.id,
        data: formData,
      });
      toast({
        title: "Succès",
        description: "Document modifié avec succès",
      });
      setEditDialogOpen(false);
      setDocumentToEdit(null);
      setSelectedFile(null);
      setRemoveCurrentFile(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la modification du document",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await deleteDocumentMutation.mutateAsync({
        id: documentToDelete.id,
        chauffeurId: chauffeur.id,
      });
      toast({
        title: "Succès",
        description: "Document supprimé avec succès",
      });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du document",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog with document data
  const openEditDialog = (doc: DocumentChauffeur) => {
    setDocumentToEdit(doc);
    editForm.reset({
      type: doc.type,
      numero: doc.numero || "",
      dateExpiration: doc.dateExpiration ? new Date(doc.dateExpiration).toISOString().split('T')[0] : "",
    });
    setSelectedFile(null);
    setRemoveCurrentFile(false);
    setEditDialogOpen(true);
  };

  // Reset add form when dialog closes
  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      addForm.reset();
      setSelectedFile(null);
    }
  };

  // Reset edit form when dialog closes
  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setDocumentToEdit(null);
      setSelectedFile(null);
      setRemoveCurrentFile(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total documents</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{stats.expired}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Expirés</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">
                {stats.expiringSoon}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Expirent bientôt</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.valid}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valides</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setAddDialogOpen(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      {/* Documents Grid */}
      {sortedDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aucun document enregistré
            </p>
            <p className="text-muted-foreground text-sm text-center mt-1">
              Ajoutez des documents pour suivre les dates d'expiration
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              documentTypes={allDocumentTypes}
              onEdit={() => openEditDialog(doc)}
              onDelete={() => {
                setDocumentToDelete(doc);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Add Document Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ajouter un document
            </DialogTitle>
            <DialogDescription>
              Ajoutez un document pour {chauffeur.nom} {chauffeur.prenom}
            </DialogDescription>
          </DialogHeader>

          {/* Duplicate Document Warning */}
          {existingDocOfType && (
            <Alert className="border-amber-300 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Document existant!</strong> Un document de type "{allDocumentTypes[existingDocOfType.type]?.label || existingDocOfType.type}" existe déjà.
                <div className="mt-2 flex items-center gap-2">
                  {existingDocOfType.dateExpiration && (
                    <span className="text-sm">Expire le: {formatDate(existingDocOfType.dateExpiration)}</span>
                  )}
                </div>
                <p className="text-xs mt-2">Veuillez sélectionner un autre type de document ou modifier le document existant.</p>
              </AlertDescription>
            </Alert>
          )}

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de document *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Pré-remplir le numéro avec le CIN si le type est CIN
                        if (value === TypeDocumentChauffeur.CIN && chauffeur.cin) {
                          addForm.setValue('numero', chauffeur.cin);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Predefined types */}
                        <SelectItem value={TypeDocumentChauffeur.PERMIS_CONDUIRE}>
                          🪪 Permis de conduire
                        </SelectItem>
                        <SelectItem value={TypeDocumentChauffeur.ASSURANCE_CHAUFFEUR}>
                          🛡️ Assurance chauffeur
                        </SelectItem>
                        <SelectItem value={TypeDocumentChauffeur.VISITE_MEDICALE}>
                          🏥 Visite médicale
                        </SelectItem>
                        <SelectItem value={TypeDocumentChauffeur.CIN}>
                          🪪 Carte d'identité nationale
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

              <FormField
                control={addForm.control}
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

              <FormField
                control={addForm.control}
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

              {/* File Upload */}
              <div className="space-y-2">
                <FormLabel>Fichier (optionnel)</FormLabel>
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
                  onClick={() => handleAddDialogOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createDocumentMutation.isPending || !!existingDocOfType}
                >
                  {createDocumentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifier le document
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations du document
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de document *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Pré-remplir le numéro avec le CIN si le type est CIN
                        if (value === TypeDocumentChauffeur.CIN && chauffeur.cin) {
                          editForm.setValue('numero', chauffeur.cin);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Predefined types */}
                        <SelectItem value={TypeDocumentChauffeur.PERMIS_CONDUIRE}>
                          🪪 Permis de conduire
                        </SelectItem>
                        <SelectItem value={TypeDocumentChauffeur.ASSURANCE_CHAUFFEUR}>
                          🛡️ Assurance chauffeur
                        </SelectItem>
                        <SelectItem value={TypeDocumentChauffeur.VISITE_MEDICALE}>
                          🏥 Visite médicale
                        </SelectItem>
                        <SelectItem value={TypeDocumentChauffeur.CIN}>
                          🪪 Carte d'identité nationale
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

              <FormField
                control={editForm.control}
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

              <FormField
                control={editForm.control}
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

              {/* Current File Display */}
              {documentToEdit?.fichier && !removeCurrentFile && (
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

              {/* New File Upload */}
              <div className="space-y-2">
                <FormLabel>{documentToEdit?.fichier && !removeCurrentFile ? "Remplacer le fichier" : "Fichier (optionnel)"}</FormLabel>
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
                  onClick={() => handleEditDialogOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={updateDocumentMutation.isPending}
                >
                  {updateDocumentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enregistrer
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
            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DocumentsTab;
