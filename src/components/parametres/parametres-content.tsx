"use client";

import * as React from "react";
import { useState, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  FilePlus,
  Bell,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Building2,
  Phone,
  CreditCard,
  MapPin,
  Upload,
  Image as ImageIcon,
  User,
  Users,
  Truck,
  Database,
  RefreshCcw,
  Settings,
  Globe,
  Lock,
} from "lucide-react";
import {
  useParametres,
  useCreateParametre,
  useUpdateParametre,
  useTypesDocuments,
  useCreateTypeDocument,
  useUpdateTypeDocument,
  useDeleteTypeDocument,
  useCheckDocumentAlerts,
  useReinitialiser,
  queryKeys,
} from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { clearSettingsCache } from "@/lib/notification-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RIBInput } from "@/components/ui/rib-input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { TypeDocumentPersonnalise } from "@/types";
import { TypesEntretienSettings } from "./types-entretien-settings";
import { CategoriesChargesSettings } from "./categories-charges-settings";
import { UtilisateursSettings } from "./utilisateurs-settings";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { 
  DateMode, 
  setDateMode, 
  getDateMode, 
  getDateModeLabel,
  initializeDateMode 
} from "@/lib/date-utils";

// Form Schema for Document Types
const typeDocumentFormSchema = z.object({
  code: z.string()
    .min(2, "Le code doit contenir au moins 2 caractères")
    .max(50, "Le code ne peut pas dépasser 50 caractères")
    .regex(/^[A-Z0-9_]+$/, "Le code doit contenir uniquement des lettres majuscules, chiffres et underscores"),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  actif: z.boolean().default(true),
});

type TypeDocumentFormValues = z.infer<typeof typeDocumentFormSchema>;

// Document Type Card Component
function DocumentTypeCard({
  type,
  onEdit,
  onDelete,
}: {
  type: TypeDocumentPersonnalise;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${!type.actif ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-green-100">
              <FilePlus className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{type.nom}</h4>
                {!type.actif && (
                  <Badge variant="secondary" className="text-xs">Inactif</Badge>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Code: {type.code}
              </p>
              {type.description && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {type.description}
                </p>
              )}
              <Badge variant="outline" className="text-xs mt-2">
                {type.categorie === 'CHAUFFEUR' ? 'Chauffeur' : 'Véhicule'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Document Types Settings Component (shared for Chauffeur and Vehicule)
function DocumentTypesSettings({ categorie }: { categorie: 'CHAUFFEUR' | 'VEHICULE' }) {
  const { toast } = useToast();
  const [addTypeDialogOpen, setAddTypeDialogOpen] = useState(false);
  const [editTypeDialogOpen, setEditTypeDialogOpen] = useState(false);
  const [deleteTypeDialogOpen, setDeleteTypeDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<TypeDocumentPersonnalise | null>(null);

  // Queries
  const { data: typesDocuments = [], isLoading } = useTypesDocuments(categorie);

  // Mutations
  const createTypeMutation = useCreateTypeDocument();
  const updateTypeMutation = useUpdateTypeDocument();
  const deleteTypeMutation = useDeleteTypeDocument();

  // Form
  const typeForm = useForm<TypeDocumentFormValues>({
    resolver: zodResolver(typeDocumentFormSchema),
    defaultValues: {
      code: "",
      nom: "",
      description: "",
      actif: true,
    },
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (addTypeDialogOpen) {
      typeForm.reset({ code: "", nom: "", description: "", actif: true });
    }
  }, [addTypeDialogOpen, typeForm]);

  React.useEffect(() => {
    if (editTypeDialogOpen && selectedType) {
      typeForm.reset({
        code: selectedType.code,
        nom: selectedType.nom,
        description: selectedType.description || "",
        actif: selectedType.actif,
      });
    }
  }, [editTypeDialogOpen, selectedType, typeForm]);

  // Handlers
  const onAddSubmit = async (values: TypeDocumentFormValues) => {
    try {
      await createTypeMutation.mutateAsync({
        ...values,
        categorie,
      });
      toast({ title: "Succès", description: "Type de document créé avec succès" });
      setAddTypeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création",
        variant: "destructive",
      });
    }
  };

  const onEditSubmit = async (values: TypeDocumentFormValues) => {
    if (!selectedType) return;
    try {
      await updateTypeMutation.mutateAsync({
        id: selectedType.id,
        data: values,
      });
      toast({ title: "Succès", description: "Type de document mis à jour avec succès" });
      setEditTypeDialogOpen(false);
      setSelectedType(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;
    try {
      await deleteTypeMutation.mutateAsync(selectedType.id);
      toast({ title: "Succès", description: "Type de document supprimé avec succès" });
      setDeleteTypeDialogOpen(false);
      setSelectedType(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  // Predefined types info
  const predefinedTypes = categorie === 'CHAUFFEUR' 
    ? [
        { code: 'PERMIS_CONDUIRE', nom: 'Permis de conduire' },
        { code: 'ASSURANCE_CHAUFFEUR', nom: 'Assurance chauffeur' },
        { code: 'VISITE_MEDICALE', nom: 'Visite médicale' },
        { code: 'CIN', nom: 'Carte d\'identité nationale' },
      ]
    : [
        { code: 'ASSURANCE', nom: 'Assurance' },
        { code: 'VISITE_TECHNIQUE', nom: 'Visite technique' },
        { code: 'CARTE_GRISE', nom: 'Carte grise' },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {categorie === 'CHAUFFEUR' ? (
              <>
                <User className="h-5 w-5" />
                Types de documents - Chauffeurs
              </>
            ) : (
              <>
                <Truck className="h-5 w-5" />
                Types de documents - Véhicules
              </>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Gérez les types de documents personnalisés pour les {categorie === 'CHAUFFEUR' ? 'chauffeurs' : 'véhicules'}
          </p>
        </div>
        <Button
          onClick={() => setAddTypeDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un type
        </Button>
      </div>

      {/* Predefined Types Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Types prédéfinis
          </CardTitle>
          <CardDescription>
            Ces types sont disponibles par défaut et ne peuvent pas être modifiés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {predefinedTypes.map((type) => (
              <div key={type.code} className="flex items-center gap-2 p-2 bg-white rounded border">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{type.nom}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Types List */}
      <div>
        <h4 className="font-medium mb-3">Types personnalisés</h4>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : typesDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FilePlus className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center">
                Aucun type de document personnalisé
              </p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Créez des types personnalisés pour des documents spécifiques
              </p>
              <Button
                onClick={() => setAddTypeDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un type
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {typesDocuments.map((type) => (
              <DocumentTypeCard
                key={type.id}
                type={type}
                onEdit={() => {
                  setSelectedType(type);
                  setEditTypeDialogOpen(true);
                }}
                onDelete={() => {
                  setSelectedType(type);
                  setDeleteTypeDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addTypeDialogOpen} onOpenChange={setAddTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un type de document</DialogTitle>
            <DialogDescription>
              Créez un nouveau type de document pour les {categorie === 'CHAUFFEUR' ? 'chauffeurs' : 'véhicules'}
            </DialogDescription>
          </DialogHeader>
          <Form {...typeForm}>
            <form onSubmit={typeForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={typeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EX: ATTESTATION_FORMATION"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Lettres majuscules, chiffres et underscores uniquement
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Attestation de formation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description optionnelle..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="actif"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Actif</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Ce type sera disponible pour la sélection
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddTypeDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createTypeMutation.isPending}>
                  {createTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editTypeDialogOpen} onOpenChange={setEditTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type de document</DialogTitle>
            <DialogDescription>
              Modifiez les informations du type de document
            </DialogDescription>
          </DialogHeader>
          <Form {...typeForm}>
            <form onSubmit={typeForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={typeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EX: ATTESTATION_FORMATION"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Attestation de formation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description optionnelle..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={typeForm.control}
                name="actif"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Actif</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Ce type sera disponible pour la sélection
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTypeDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateTypeMutation.isPending}>
                  {updateTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteTypeDialogOpen} onOpenChange={setDeleteTypeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le type de document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le type &quot;{selectedType?.nom}&quot; ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTypeMutation.isPending}
            >
              {deleteTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Notification Settings Component
function NotificationsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification settings state
  const [settings, setSettings] = useState({
    alertDocumentExpiration: true,
    alertDocumentDays: 30,
    alertFactureRetard: true,
    alertFactureDays: 7,
    alertEntretien: true,
    alertEntretienDays: 15,
    alertContratCDD: true,
    alertContratCDDDays: 30,
    alertContratClient: true,
    alertContratClientDays: 30,
    emailNotifications: false,
    emailRecipient: "",
    pushNotifications: true,
    soundEnabled: true,
  });

  // Load settings from parametres
  const { data: parametres } = useParametres();
  
  React.useEffect(() => {
    if (parametres) {
      const loadSetting = (key: string, defaultValue: unknown) => {
        const param = parametres.find(p => p.cle === key);
        if (param) {
          if (typeof defaultValue === 'boolean') {
            return param.valeur === 'true';
          }
          if (typeof defaultValue === 'number') {
            return parseInt(param.valeur) || defaultValue;
          }
          return param.valeur;
        }
        return defaultValue;
      };

      setSettings({
        alertDocumentExpiration: loadSetting('NOTIF_DOCUMENT_EXPIRATION', true),
        alertDocumentDays: loadSetting('NOTIF_DOCUMENT_DAYS', 30),
        alertFactureRetard: loadSetting('NOTIF_FACTURE_RETARD', true),
        alertFactureDays: loadSetting('NOTIF_FACTURE_DAYS', 7),
        alertEntretien: loadSetting('NOTIF_ENTRETIEN', true),
        alertEntretienDays: loadSetting('NOTIF_ENTRETIEN_DAYS', 15),
        alertContratCDD: loadSetting('NOTIF_CONTRAT_CDD', true),
        alertContratCDDDays: loadSetting('NOTIF_CONTRAT_CDD_DAYS', 30),
        alertContratClient: loadSetting('NOTIF_CONTRAT_CLIENT', true),
        alertContratClientDays: loadSetting('NOTIF_CONTRAT_CLIENT_DAYS', 30),
        emailNotifications: loadSetting('NOTIF_EMAIL_ENABLED', false),
        emailRecipient: loadSetting('NOTIF_EMAIL_RECIPIENT', ''),
        pushNotifications: loadSetting('NOTIF_PUSH_ENABLED', true),
        soundEnabled: loadSetting('NOTIF_SOUND_ENABLED', true),
      });
    }
  }, [parametres]);

  // Create/Update mutation
  const createMutation = useCreateParametre();
  const updateMutation = useUpdateParametre();
  const checkAlertsMutation = useCheckDocumentAlerts();

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { cle: 'NOTIF_DOCUMENT_EXPIRATION', valeur: String(settings.alertDocumentExpiration) },
        { cle: 'NOTIF_DOCUMENT_DAYS', valeur: String(settings.alertDocumentDays) },
        { cle: 'NOTIF_FACTURE_RETARD', valeur: String(settings.alertFactureRetard) },
        { cle: 'NOTIF_FACTURE_DAYS', valeur: String(settings.alertFactureDays) },
        { cle: 'NOTIF_ENTRETIEN', valeur: String(settings.alertEntretien) },
        { cle: 'NOTIF_ENTRETIEN_DAYS', valeur: String(settings.alertEntretienDays) },
        { cle: 'NOTIF_CONTRAT_CDD', valeur: String(settings.alertContratCDD) },
        { cle: 'NOTIF_CONTRAT_CDD_DAYS', valeur: String(settings.alertContratCDDDays) },
        { cle: 'NOTIF_CONTRAT_CLIENT', valeur: String(settings.alertContratClient) },
        { cle: 'NOTIF_CONTRAT_CLIENT_DAYS', valeur: String(settings.alertContratClientDays) },
        { cle: 'NOTIF_EMAIL_ENABLED', valeur: String(settings.emailNotifications) },
        { cle: 'NOTIF_EMAIL_RECIPIENT', valeur: settings.emailRecipient },
        { cle: 'NOTIF_PUSH_ENABLED', valeur: String(settings.pushNotifications) },
        { cle: 'NOTIF_SOUND_ENABLED', valeur: String(settings.soundEnabled) },
      ];

      for (const setting of settingsToSave) {
        const existing = parametres?.find(p => p.cle === setting.cle);
        if (existing) {
          await updateMutation.mutateAsync({ id: existing.id, data: setting });
        } else {
          await createMutation.mutateAsync(setting);
        }
      }

      clearSettingsCache();

      try {
        const result = await checkAlertsMutation.mutateAsync();
        
        if (result.success && result.data) {
          const data = result.data;
          const parts = [];
          if (data.documents > 0) parts.push(`${data.documents} document(s)`);
          if (data.factures > 0) parts.push(`${data.factures} facture(s)`);
          if (data.entretiens > 0) parts.push(`${data.entretiens} entretien(s)`);
          if (data.contratsCDD > 0) parts.push(`${data.contratsCDD} contrat(s) CDD`);
          if (data.chauffeursDesactivates > 0) parts.push(`${data.chauffeursDesactivates} chauffeur(s) désactivé(s)`);
          
          queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
          queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
          
          toast({
            title: "Succès",
            description: data.total > 0 || data.chauffeursDesactivates > 0
              ? `Paramètres enregistrés. ${parts.join(', ')}.`
              : "Paramètres enregistrés. Alertes mises à jour selon les nouveaux critères.",
          });
        } else {
          toast({
            title: "Succès",
            description: "Paramètres de notifications enregistrés",
          });
        }
      } catch {
        queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
        queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
        
        toast({
          title: "Succès",
          description: "Paramètres de notifications enregistrés",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Paramètres des notifications
          </h3>
          <p className="text-sm text-muted-foreground">
            Gérez comment et quand vous recevez les alertes
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90"
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer les paramètres
        </Button>
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documents & Expirations
          </CardTitle>
          <CardDescription>
            Alertes pour les documents arrivant à expiration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertes d&apos;expiration de documents</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir une alerte avant l&apos;expiration des documents
              </p>
            </div>
            <Switch
              checked={settings.alertDocumentExpiration}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, alertDocumentExpiration: checked }))
              }
            />
          </div>
          
          {settings.alertDocumentExpiration && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Jours avant expiration</Label>
                <p className="text-xs text-muted-foreground">
                  Nombre de jours pour l&apos;alerte anticipée
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  className="w-20"
                  value={settings.alertDocumentDays}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, alertDocumentDays: parseInt(e.target.value) || 30 }))
                  }
                />
                <span className="text-sm text-muted-foreground">jours</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factures Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Factures impayées
          </CardTitle>
          <CardDescription>
            Alertes pour les factures en retard de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertes de retard de paiement</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir une alerte pour les factures impayées
              </p>
            </div>
            <Switch
              checked={settings.alertFactureRetard}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, alertFactureRetard: checked }))
              }
            />
          </div>
          
          {settings.alertFactureRetard && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-orange-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Jours de retard</Label>
                <p className="text-xs text-muted-foreground">
                  Alerte après X jours de retard
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  className="w-20"
                  value={settings.alertFactureDays}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, alertFactureDays: parseInt(e.target.value) || 7 }))
                  }
                />
                <span className="text-sm text-muted-foreground">jours</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entretien Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            Entretiens véhicules
          </CardTitle>
          <CardDescription>
            Alertes pour les entretiens programmés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertes d&apos;entretien</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir une alerte avant les échéances d&apos;entretien
              </p>
            </div>
            <Switch
              checked={settings.alertEntretien}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, alertEntretien: checked }))
              }
            />
          </div>
          
          {settings.alertEntretien && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-green-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Jours avant l&apos;échéance</Label>
                <p className="text-xs text-muted-foreground">
                  Nombre de jours pour l&apos;alerte anticipée
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  className="w-20"
                  value={settings.alertEntretienDays}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, alertEntretienDays: parseInt(e.target.value) || 15 }))
                  }
                />
                <span className="text-sm text-muted-foreground">jours</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CDD Contract Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Contrats CDD
          </CardTitle>
          <CardDescription>
            Alertes pour les contrats à durée déterminée arrivant à expiration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertes d&apos;expiration de contrat</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir une alerte avant l&apos;expiration des contrats CDD
              </p>
            </div>
            <Switch
              checked={settings.alertContratCDD}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, alertContratCDD: checked }))
              }
            />
          </div>
          
          {settings.alertContratCDD && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-blue-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Jours avant expiration</Label>
                <p className="text-xs text-muted-foreground">
                  Nombre de jours pour l&apos;alerte anticipée
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  className="w-20"
                  value={settings.alertContratCDDDays}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, alertContratCDDDays: parseInt(e.target.value) || 30 }))
                  }
                />
                <span className="text-sm text-muted-foreground">jours</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Contract Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            Contrats Clients
          </CardTitle>
          <CardDescription>
            Alertes pour les contrats clients arrivant à expiration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertes d&apos;expiration de contrat</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir une alerte avant l&apos;expiration des contrats clients
              </p>
            </div>
            <Switch
              checked={settings.alertContratClient}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, alertContratClient: checked }))
              }
            />
          </div>
          
          {settings.alertContratClient && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-orange-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Jours avant expiration</Label>
                <p className="text-xs text-muted-foreground">
                  Nombre de jours pour l&apos;alerte anticipée
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  className="w-20"
                  value={settings.alertContratClientDays}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, alertContratClientDays: parseInt(e.target.value) || 30 }))
                  }
                />
                <span className="text-sm text-muted-foreground">jours</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Methods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-purple-500" />
            Méthodes de notification
          </CardTitle>
          <CardDescription>
            Comment vous souhaitez recevoir les alertes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Notifications push</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Afficher les notifications dans l&apos;application
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, pushNotifications: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">🔊</span>
                <Label className="text-sm font-medium">Son de notification</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Jouer un son lors des nouvelles alertes
              </p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, soundEnabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Notifications par email</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Recevoir les alertes par email (optionnel)
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, emailNotifications: checked }))
              }
            />
          </div>

          {settings.emailNotifications && (
            <div className="pl-4 border-l-2 border-purple-200 space-y-2">
              <Label className="text-sm font-medium">Adresse email</Label>
              <Input
                type="email"
                placeholder="exemple@email.com"
                value={settings.emailRecipient}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, emailRecipient: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Les alertes importantes seront envoyées à cette adresse
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Résumé des paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${settings.alertDocumentExpiration ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${settings.alertFactureRetard ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Factures</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${settings.alertEntretien ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Entretiens</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${settings.alertContratCDD ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Contrats CDD</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${settings.emailNotifications ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Email</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Date Mode Settings Component
function DateModeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [dateMode, setLocalDateMode] = useState<DateMode>(DateMode.MOROCCO_UTC);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<DateMode | null>(null);
  
  const { data: parametres } = useParametres();
  const createMutation = useCreateParametre();
  const updateMutation = useUpdateParametre();
  
  // Load date mode from parameters
  React.useEffect(() => {
    if (parametres) {
      const dateModeParam = parametres.find(p => p.cle === 'APP_DATE_MODE');
      if (dateModeParam) {
        const mode = dateModeParam.valeur as DateMode;
        if (mode === DateMode.LOCAL || mode === DateMode.MOROCCO_UTC) {
          setLocalDateMode(mode);
          setDateMode(mode);
        }
      }
    }
  }, [parametres]);
  
  // Handle click on date mode option - show confirmation first
  const handleDateModeClick = (mode: DateMode) => {
    if (mode === dateMode) return; // No change needed
    setPendingMode(mode);
    setConfirmDialogOpen(true);
  };
  
  // Confirm and execute date mode change
  const handleConfirmChange = async () => {
    if (!pendingMode) return;
    
    setConfirmDialogOpen(false);
    setIsSaving(true);
    try {
      const existing = parametres?.find(p => p.cle === 'APP_DATE_MODE');
      
      if (existing) {
        await updateMutation.mutateAsync({ 
          id: existing.id, 
          data: { cle: 'APP_DATE_MODE', valeur: pendingMode } 
        });
      } else {
        await createMutation.mutateAsync({ 
          cle: 'APP_DATE_MODE', 
          valeur: pendingMode 
        });
      }
      
      setLocalDateMode(pendingMode);
      setDateMode(pendingMode);
      
      // Invalidate queries to refresh data with new date mode
      queryClient.invalidateQueries();
      
      toast({
        title: "Succès",
        description: `Mode de date modifié: ${getDateModeLabel(pendingMode)}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification du mode de date",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setPendingMode(null);
    }
  };
  
  // Cancel the change
  const handleCancelChange = () => {
    setConfirmDialogOpen(false);
    setPendingMode(null);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Paramètres de date et fuseau horaire
          </h3>
          <p className="text-sm text-muted-foreground">
            Configurez le mode de gestion des dates dans l&apos;application
          </p>
        </div>
      </div>

      {/* Explanation Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Comprendre les modes de date
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-green-600" />
                UTC Maroc (Recommandé)
              </h4>
              <p className="text-sm text-muted-foreground">
                Utilise le fuseau horaire du Maroc (Africa/Casablanca). 
                Recommandé si l&apos;application est utilisée principalement au Maroc.
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Fuseau: UTC+0 (hiver) / UTC+1 (été)</li>
                <li>• Affichage cohérent pour tous les utilisateurs</li>
                <li>• Dates indépendantes du navigateur</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Local (Navigateur)
              </h4>
              <p className="text-sm text-muted-foreground">
                Utilise le fuseau horaire du navigateur de l&apos;utilisateur.
                Utile si l&apos;application est utilisée dans plusieurs pays.
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Fuseau: Celui du navigateur</li>
                <li>• Affichage adapté à chaque utilisateur</li>
                <li>• Peut varier selon la localisation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mode de date actuel</CardTitle>
          <CardDescription>
            Sélectionnez le mode de gestion des dates pour l&apos;application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Morocco UTC Option */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  dateMode === DateMode.MOROCCO_UTC
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleDateModeClick(DateMode.MOROCCO_UTC)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    dateMode === DateMode.MOROCCO_UTC
                      ? 'border-primary bg-primary'
                      : 'border-gray-300'
                  }`}>
                    {dateMode === DateMode.MOROCCO_UTC && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="font-medium">UTC Maroc</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Africa/Casablanca (UTC+0/+1)
                    </p>
                    <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                      Recommandé
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Local Option */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  dateMode === DateMode.LOCAL
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleDateModeClick(DateMode.LOCAL)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    dateMode === DateMode.LOCAL
                      ? 'border-primary bg-primary'
                      : 'border-gray-300'
                  }`}>
                    {dateMode === DateMode.LOCAL && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Local</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fuseau horaire du navigateur
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Résumé des paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <span className="text-sm">Mode actuel:</span>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {getDateModeLabel(dateMode)}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <span className="text-sm">Date du jour:</span>
              <span className="font-medium">
                {new Intl.DateTimeFormat('fr-FR', {
                  timeZone: dateMode === DateMode.MOROCCO_UTC ? 'Africa/Casablanca' : undefined,
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(new Date())}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de mode de date</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const currentLabel = dateMode ? getDateModeLabel(dateMode) : "";
                const newLabel = pendingMode ? getDateModeLabel(pendingMode) : "";
                return (
                  <>
                    Êtes-vous sûr de vouloir changer le mode de date de &quot;{currentLabel}&quot; vers &quot;{newLabel}&quot; ?
                    <br /><br />
                    Ce changement peut affecter l&apos;affichage des dates dans toute l&apos;application.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelChange}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              className="bg-primary hover:bg-primary/90"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Company Information Settings Component
function EntrepriseSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [entreprise, setEntreprise] = useState({
    nom: "",
    ice: "",
    adresse: "",
    ville: "",
    telephone: "",
    email: "",
    rc: "",
    if: "",
    compteBancaire: "",
    siteWeb: "",
    logo: "",
  });

  const { data: parametres } = useParametres();
  
  React.useEffect(() => {
    if (parametres) {
      const loadSetting = (key: string, defaultValue: string) => {
        const param = parametres.find(p => p.cle === key);
        return param ? param.valeur : defaultValue;
      };

      setEntreprise({
        nom: loadSetting('ENTREPRISE_NOM', ''),
        ice: loadSetting('ENTREPRISE_ICE', ''),
        adresse: loadSetting('ENTREPRISE_ADRESSE', ''),
        ville: loadSetting('ENTREPRISE_VILLE', 'Casablanca'),
        telephone: loadSetting('ENTREPRISE_TELEPHONE', ''),
        email: loadSetting('ENTREPRISE_EMAIL', ''),
        rc: loadSetting('ENTREPRISE_RC', ''),
        if: loadSetting('ENTREPRISE_IF', ''),
        compteBancaire: loadSetting('ENTREPRISE_COMPTE_BANCAIRE', ''),
        siteWeb: loadSetting('ENTREPRISE_SITE_WEB', ''),
        logo: loadSetting('ENTREPRISE_LOGO', ''),
      });
      
      const logoValue = loadSetting('ENTREPRISE_LOGO', '');
      if (logoValue) {
        setLogoPreview(logoValue);
      }
    }
  }, [parametres]);

  const createMutation = useCreateParametre();
  const updateMutation = useUpdateParametre();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un fichier image",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "Le fichier ne doit pas dépasser 2 Mo",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setEntreprise(prev => ({ ...prev, logo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { cle: 'ENTREPRISE_NOM', valeur: entreprise.nom },
        { cle: 'ENTREPRISE_ICE', valeur: entreprise.ice },
        { cle: 'ENTREPRISE_ADRESSE', valeur: entreprise.adresse },
        { cle: 'ENTREPRISE_VILLE', valeur: entreprise.ville },
        { cle: 'ENTREPRISE_TELEPHONE', valeur: entreprise.telephone },
        { cle: 'ENTREPRISE_EMAIL', valeur: entreprise.email },
        { cle: 'ENTREPRISE_RC', valeur: entreprise.rc },
        { cle: 'ENTREPRISE_IF', valeur: entreprise.if },
        { cle: 'ENTREPRISE_COMPTE_BANCAIRE', valeur: entreprise.compteBancaire },
        { cle: 'ENTREPRISE_SITE_WEB', valeur: entreprise.siteWeb },
        { cle: 'ENTREPRISE_LOGO', valeur: entreprise.logo },
      ];

      for (const setting of settingsToSave) {
        const existing = parametres?.find(p => p.cle === setting.cle);
        if (existing) {
          await updateMutation.mutateAsync({ id: existing.id, data: setting });
        } else {
          await createMutation.mutateAsync(setting);
        }
      }

      toast({
        title: "Succès",
        description: "Informations de l'entreprise enregistrées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations de l&apos;entreprise
          </h3>
          <p className="text-sm text-muted-foreground">
            Ces informations apparaîtront sur vos factures et documents officiels
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90"
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer les informations
        </Button>
      </div>

      {/* Logo Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Logo de l&apos;entreprise
          </CardTitle>
          <CardDescription>
            Le logo apparaîtra sur vos factures et documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {logoPreview ? (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo entreprise" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center">
                  <Building2 className="h-10 w-10 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-2">Aucun logo</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choisir un logo
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setLogoPreview(null);
                    setEntreprise(prev => ({ ...prev, logo: '' }));
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou SVG. Max 2 Mo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Informations générales
          </CardTitle>
          <CardDescription>
            Nom et identifiants de l&apos;entreprise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nom de l&apos;entreprise</Label>
              <Input
                placeholder="MGK Transport"
                value={entreprise.nom}
                onChange={(e) => setEntreprise(prev => ({ ...prev, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Numéro ICE</Label>
              <Input
                placeholder="001234567890123"
                value={entreprise.ice}
                onChange={(e) => setEntreprise(prev => ({ ...prev, ice: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Adresse</Label>
            <Textarea
              placeholder="123 Rue Example, Casablanca, Maroc"
              value={entreprise.adresse}
              onChange={(e) => setEntreprise(prev => ({ ...prev, adresse: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ville</Label>
              <Input
                placeholder="Casablanca"
                value={entreprise.ville}
                onChange={(e) => setEntreprise(prev => ({ ...prev, ville: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Utilisée pour les attestations et documents officiels
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            Coordonnées
          </CardTitle>
          <CardDescription>
            Téléphone, email et site web
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Téléphone</Label>
              <Input
                placeholder="+212 5XX XXX XXX"
                value={entreprise.telephone}
                onChange={(e) => setEntreprise(prev => ({ ...prev, telephone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                placeholder="contact@entreprise.com"
                value={entreprise.email}
                onChange={(e) => setEntreprise(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Site Web</Label>
            <Input
              placeholder="https://www.entreprise.com"
              value={entreprise.siteWeb}
              onChange={(e) => setEntreprise(prev => ({ ...prev, siteWeb: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Legal & Financial Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-500" />
            Informations légales et bancaires
          </CardTitle>
          <CardDescription>
            Registre de commerce, identifiant fiscal et compte bancaire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">RC (Registre de Commerce)</Label>
              <Input
                placeholder="123456"
                value={entreprise.rc}
                onChange={(e) => setEntreprise(prev => ({ ...prev, rc: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">IF (Identifiant Fiscal)</Label>
              <Input
                placeholder="123456789"
                value={entreprise.if}
                onChange={(e) => setEntreprise(prev => ({ ...prev, if: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">N° Compte Bancaire (RIB)</Label>
            <RIBInput
              value={entreprise.compteBancaire?.replace(/\s/g, '') || ''}
              onChange={(value) => {
                setEntreprise(prev => ({ ...prev, compteBancaire: value }));
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Format: 011 780 0000123456789012 34
              </p>
              <p className="text-xs text-muted-foreground">
                {(entreprise.compteBancaire?.replace(/\s/g, '') || '').length}/24 chiffres
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Aperçu sur les documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-lg">{entreprise.nom || 'Nom de l\'entreprise'}</h4>
                {(entreprise.adresse || entreprise.ville) && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {[entreprise.adresse, entreprise.ville].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                  {entreprise.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {entreprise.telephone}
                    </span>
                  )}
                  {entreprise.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {entreprise.email}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                  {entreprise.ice && <span>ICE: {entreprise.ice}</span>}
                  {entreprise.rc && <span>RC: {entreprise.rc}</span>}
                  {entreprise.if && <span>IF: {entreprise.if}</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Backup Settings Component
function BackupSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<Record<string, number> | null>(null);

  // Export data
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/backup/export');
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mgk_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Succès",
        description: "Sauvegarde téléchargée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export des données",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un fichier JSON",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // Import data
  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }
      
      setImportStats(result.stats);
      setImportDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: "Succès",
        description: "Données importées avec succès",
      });
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'import des données",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Sauvegarde et Importation
        </h3>
        <p className="text-sm text-muted-foreground">
          Exportez ou importez les données de l&apos;application
        </p>
      </div>

      {/* Export Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-green-600" />
            Exporter les données
          </CardTitle>
          <CardDescription>
            Téléchargez une sauvegarde complète de toutes les données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="space-y-1">
              <p className="font-medium text-green-800">Sauvegarde complète</p>
              <p className="text-sm text-green-700">
                Exporte toutes les données : chauffeurs, véhicules, clients, factures, etc.
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Exporter
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Importer les données
          </CardTitle>
          <CardDescription>
            Restaurer les données à partir d&apos;un fichier de sauvegarde
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-800">Attention</p>
              <p className="text-sm text-amber-700">
                L&apos;importation remplacera toutes les données existantes. Assurez-vous d&apos;avoir fait une sauvegarde avant d&apos;importer.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-1">
              <p className="font-medium text-blue-800">Restaurer une sauvegarde</p>
              <p className="text-sm text-blue-700">
                Sélectionnez un fichier de sauvegarde (.json)
              </p>
            </div>
            <Button
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
          </div>

          {/* Import Stats */}
          {importStats && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Importation réussie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {Object.entries(importStats).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between p-2 bg-white rounded border">
                        <span className="capitalize">{key}</span>
                        <Badge variant="secondary">{value}</Badge>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <p>• La sauvegarde inclut toutes les données de l&apos;application</p>
          <p>• Le fichier exporté est au format JSON</p>
          <p>• Conservez vos sauvegardes dans un endroit sécurisé</p>
          <p>• L&apos;importation remplacera toutes les données existantes</p>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importer les données</AlertDialogTitle>
            <AlertDialogDescription>
              Sélectionnez un fichier de sauvegarde (.json). Cette action remplacera toutes les données existantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-muted-foreground">
                Fichier sélectionné : {selectedFile.name}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import...
                </>
              ) : (
                "Importer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Reinitialisation Settings Component
function ReinitialisationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [resetResults, setResetResults] = useState<Array<{ table: string; deleted: number }> | null>(null);

  const reinitialiserMutation = useReinitialiser();

  const handleReset = async () => {
    if (confirmationText !== "REINITIALISER") {
      toast({
        title: "Erreur",
        description: "Veuillez taper REINITIALISER pour confirmer",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await reinitialiserMutation.mutateAsync();
      setResetResults(result.data?.results || null);
      setResetDialogOpen(false);
      setConfirmationText("");

      toast({
        title: "Succès",
        description: "Application réinitialisée avec succès",
      });

      // Invalidate all queries
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la réinitialisation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Réinitialisation de l&apos;application
        </h3>
        <p className="text-sm text-muted-foreground">
          Supprimer toutes les données de l&apos;application
        </p>
      </div>

      {/* Warning Card */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Avertissement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-red-700">
              Cette action va <strong>supprimer définitivement</strong> toutes les données de l&apos;application, y compris :
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <User className="h-4 w-4 text-red-600" />
                <span className="text-sm">Chauffeurs</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <Truck className="h-4 w-4 text-red-600" />
                <span className="text-sm">Véhicules</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <Building2 className="h-4 w-4 text-red-600" />
                <span className="text-sm">Clients</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <FileText className="h-4 w-4 text-red-600" />
                <span className="text-sm">Factures</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <CreditCard className="h-4 w-4 text-red-600" />
                <span className="text-sm">Paiements</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm">Entretiens</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <Database className="h-4 w-4 text-red-600" />
                <span className="text-sm">Salaires</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <Bell className="h-4 w-4 text-red-600" />
                <span className="text-sm">Alertes</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                <FilePlus className="h-4 w-4 text-red-600" />
                <span className="text-sm">Documents</span>
              </div>
            </div>
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Cette action est IRRÉVERSIBLE. Les paramètres de l&apos;entreprise seront conservés.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Button
        variant="destructive"
        size="lg"
        onClick={() => setResetDialogOpen(true)}
        className="w-full sm:w-auto"
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Réinitialiser l&apos;application
      </Button>

      {/* Results Card (shown after reset) */}
      {resetResults && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Réinitialisation terminée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resetResults.map((result, index) => (
                result.deleted > 0 && (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{result.table}</span>
                    <span className="font-medium">{result.deleted} supprimé(s)</span>
                  </div>
                )
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setResetResults(null)}
            >
              Fermer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la réinitialisation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Vous êtes sur le point de supprimer <strong>toutes les données</strong> de l&apos;application.
                  Cette action est irréversible.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Tapez <code className="bg-muted px-2 py-1 rounded font-mono">REINITIALISER</code> pour confirmer :
                  </p>
                  <Input
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                    placeholder="REINITIALISER"
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationText("")}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmationText !== "REINITIALISER" || reinitialiserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reinitialiserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Réinitialiser tout
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Mon Profil Settings Component
function MonProfilSettings() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'COMPTABLE':
        return 'Comptable';
      case 'EXPLOITATION':
        return 'Exploitation';
      case 'CHAUFFEUR':
        return 'Chauffeur';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'COMPTABLE':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EXPLOITATION':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'CHAUFFEUR':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Mon Profil
        </h3>
        <p className="text-sm text-muted-foreground">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du compte</CardTitle>
          <CardDescription>
            Vos informations de connexion et votre rôle dans l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Nom complet</Label>
              <p className="font-medium">{user?.nom} {user?.prenom}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Rôle</Label>
              <div>
                <Badge variant="outline" className={getRoleBadgeColor(user?.role || '')}>
                  {getRoleLabel(user?.role || '')}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sécurité
          </CardTitle>
          <CardDescription>
            Changez votre mot de passe pour sécuriser votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Mot de passe</p>
              <p className="text-sm text-muted-foreground">
                Dernière modification : Non disponible
              </p>
            </div>
            <Button onClick={() => setShowPasswordModal(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Changer le mot de passe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Permissions de votre rôle
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.role === 'ADMIN' && (
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Accès total à toutes les fonctionnalités</li>
              <li>• Gestion des utilisateurs et leurs droits</li>
              <li>• Configuration des paramètres de l'application</li>
              <li>• Accès à tous les modules (Chauffeurs, Véhicules, Clients, Factures, etc.)</li>
            </ul>
          )}
          {user?.role === 'COMPTABLE' && (
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Gestion de la facturation</li>
              <li>• Suivi des paiements</li>
              <li>• Accès aux rapports financiers</li>
              <li>• Gestion des charges</li>
            </ul>
          )}
          {user?.role === 'EXPLOITATION' && (
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Gestion des chauffeurs</li>
              <li>• Gestion des véhicules</li>
              <li>• Suivi des services et trajets</li>
              <li>• Gestion du carburant et entretiens</li>
            </ul>
          )}
          {user?.role === 'CHAUFFEUR' && (
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Consultation de vos services assignés</li>
              <li>• Marquage des services comme terminés</li>
              <li>• Accès à vos informations personnelles</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Password Modal */}
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={setShowPasswordModal} 
      />
    </div>
  );
}

export function ParametresContent() {
  const [selectedSection, setSelectedSection] = useState<string>("entreprise");

  // Section options with icons and labels
  const sectionOptions = [
    { value: "mon-profil", label: "Mon Profil", icon: User },
    { value: "entreprise", label: "Entreprise", icon: Building2 },
    { value: "application", label: "Application", icon: Settings },
    { value: "notifications", label: "Notifications", icon: Bell },
    { value: "utilisateurs", label: "Utilisateurs", icon: Users },
    { value: "docs-chauffeur", label: "Documents Chauffeurs", icon: User },
    { value: "docs-vehicule", label: "Documents Véhicules", icon: Truck },
    { value: "types-entretien", label: "Types Entretiens", icon: Clock },
    { value: "categories-charges", label: "Catégories Charges", icon: CreditCard },
    { value: "sauvegarde", label: "Sauvegarde", icon: Database },
    { value: "reinitialiser", label: "Réinitialiser", icon: Database, destructive: true },
  ];

  // Get current section info
  const currentSection = sectionOptions.find(s => s.value === selectedSection);

  // Render content based on selected section
  const renderContent = () => {
    switch (selectedSection) {
      case "mon-profil":
        return <MonProfilSettings />;
      case "entreprise":
        return <EntrepriseSettings />;
      case "application":
        return <DateModeSettings />;
      case "notifications":
        return <NotificationsSettings />;
      case "utilisateurs":
        return <UtilisateursSettings />;
      case "docs-chauffeur":
        return <DocumentTypesSettings categorie="CHAUFFEUR" />;
      case "docs-vehicule":
        return <DocumentTypesSettings categorie="VEHICULE" />;
      case "types-entretien":
        return <TypesEntretienSettings />;
      case "categories-charges":
        return <CategoriesChargesSettings />;
      case "sauvegarde":
        return <BackupSettings />;
      case "reinitialiser":
        return <ReinitialisationSettings />;
      default:
        return <EntrepriseSettings />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Section de paramètres
          </label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-full sm:w-[320px] h-12">
              <SelectValue placeholder="Sélectionner une section">
                {currentSection && (
                  <div className="flex items-center gap-2">
                    <currentSection.icon className={`h-5 w-5 ${currentSection.destructive ? 'text-red-500' : 'text-primary'}`} />
                    <span className={currentSection.destructive ? 'text-red-600 font-medium' : ''}>
                      {currentSection.label}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <option.icon className={`h-4 w-4 ${option.destructive ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <span className={option.destructive ? 'text-red-600' : ''}>
                      {option.label}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
}

export default ParametresContent;
