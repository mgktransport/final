"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Check,
  Trash2,
  MoreHorizontal,
  XCircle,
  Loader2,
  RefreshCw,
  FileSearch,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { TypeAlerte, PrioriteAlerte, type Alerte } from "@/types";
import {
  useAlertes,
  useUpdateAlerte,
  useDeleteAlerte,
  useCheckDocumentAlerts,
} from "@/hooks/use-queries";
import { useToast } from "@/hooks/use-toast";
import { 
  requestNotificationPermission, 
  showPushNotification, 
  playNotificationSound 
} from "@/lib/notification-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Type Alert Labels
const TYPE_ALERTE_LABELS: Record<TypeAlerte, string> = {
  ASSURANCE_VEHICULE_EXPIREE: "Assurance véhicule expirée",
  PERMIS_CHAUFFEUR_EXPIRE: "Permis chauffeur expiré",
  VISITE_TECHNIQUE_PROCHE: "Visite technique proche",
  ENTRETIEN_A_VENIR: "Entretien à venir",
  FACTURE_IMPAYEE: "Facture impayée",
  DOCUMENT_EXPIRE: "Document expiré",
};

// Priority Labels
const PRIORITE_LABELS: Record<PrioriteAlerte, { label: string; color: string; bgColor: string }> = {
  HAUTE: { label: "Haute", color: "text-red-700", bgColor: "bg-red-100" },
  MOYENNE: { label: "Moyenne", color: "text-orange-700", bgColor: "bg-orange-100" },
  BASSE: { label: "Basse", color: "text-yellow-700", bgColor: "bg-yellow-100" },
};

// Alert Item Component
function AlertItem({
  alerte,
  onMarkRead,
  onResolve,
  onDelete,
}: {
  alerte: Alerte;
  onMarkRead: () => void;
  onResolve: () => void;
  onDelete: () => void;
}) {
  const priorityInfo = PRIORITE_LABELS[alerte.priority];

  return (
    <Card className={`${!alerte.lu ? "border-l-4 border-l-primary" : ""} ${alerte.resolute ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-full ${priorityInfo.bgColor}`}>
              {alerte.resolute ? (
                <CheckCircle className={`h-5 w-5 text-green-600`} />
              ) : alerte.priority === "HAUTE" ? (
                <AlertTriangle className={`h-5 w-5 ${priorityInfo.color}`} />
              ) : (
                <Bell className={`h-5 w-5 ${priorityInfo.color}`} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{alerte.titre}</h4>
                <Badge className={priorityInfo.bgColor}>
                  {priorityInfo.label}
                </Badge>
                {!alerte.lu && (
                  <Badge variant="secondary" className="text-xs">
                    Nouveau
                  </Badge>
                )}
                {alerte.resolute && (
                  <Badge className="bg-green-100 text-green-700">
                    Résolue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {alerte.message}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{TYPE_ALERTE_LABELS[alerte.type]}</span>
                <span>•</span>
                <span>{formatDate(alerte.createdAt)}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!alerte.lu && (
                <DropdownMenuItem onClick={onMarkRead}>
                  <Check className="mr-2 h-4 w-4" />
                  Marquer comme lu
                </DropdownMenuItem>
              )}
              {!alerte.resolute && (
                <DropdownMenuItem onClick={onResolve}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marquer comme résolue
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
      </CardContent>
    </Card>
  );
}

export function AlertesContent() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [alertToDelete, setAlertToDelete] = useState<Alerte | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const prevAlertCountRef = useRef<number>(0);

  // Build query params
  const params: Record<string, unknown> = {};
  if (filter === "unread") params.lu = false;
  if (filter === "resolved") params.resolute = true;
  if (filter === "active") params.resolute = false;
  if (priorityFilter !== "all") params.priority = priorityFilter;

  // Queries
  const { data: alertes, isLoading } = useAlertes(params);

  // Mutations
  const updateAlerteMutation = useUpdateAlerte();
  const deleteAlerteMutation = useDeleteAlerte();
  const checkDocumentAlertsMutation = useCheckDocumentAlerts();

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Detect new alerts and show notification
  useEffect(() => {
    if (alertes) {
      const currentCount = alertes.filter(a => !a.lu && !a.resolute).length;
      const prevCount = prevAlertCountRef.current;
      
      // If count increased, we have new alerts
      if (currentCount > prevCount && prevCount > 0) {
        const newAlerts = alertes.filter(a => !a.lu && !a.resolute).slice(0, currentCount - prevCount);
        
        if (newAlerts.length > 0) {
          // Show notification for the first new high-priority alert
          const highPriorityAlert = newAlerts.find(a => a.priority === 'HAUTE');
          if (highPriorityAlert) {
            showPushNotification(highPriorityAlert.titre, highPriorityAlert.message);
            playNotificationSound();
          }
          
          toast({
            title: "Nouvelle alerte",
            description: `${newAlerts.length} nouvelle(s) alerte(s) détectée(s)`,
            variant: "default",
          });
        }
      }
      
      prevAlertCountRef.current = currentCount;
    }
  }, [alertes, toast]);

  // Handlers
  const handleCheckDocuments = async () => {
    try {
      const result = await checkDocumentAlertsMutation.mutateAsync();
      const data = result.data;
      
      if (data) {
        if (data.total > 0) {
          const parts = [];
          if (data.documents > 0) parts.push(`${data.documents} document(s)`);
          if (data.factures > 0) parts.push(`${data.factures} facture(s)`);
          if (data.entretiens > 0) parts.push(`${data.entretiens} entretien(s)`);
          
          // Show push notification and play sound for new alerts
          showPushNotification(
            "Nouvelles alertes détectées",
            `${data.total} alerte(s): ${parts.join(', ')}`
          );
          playNotificationSound();
          
          toast({
            title: "Alertes mises à jour",
            description: `${data.total} alerte(s): ${parts.join(', ')}`,
          });
        } else {
          toast({
            title: "Vérification terminée",
            description: "Aucune nouvelle alerte. Toutes les alertes sont à jour selon vos paramètres.",
          });
        }
      }
    } catch (error) {
      console.error('Erreur vérification alertes:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la vérification des alertes",
        variant: "destructive",
      });
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await updateAlerteMutation.mutateAsync({ id, data: { lu: true } });
      toast({ title: "Succès", description: "Alerte marquée comme lue" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateAlerteMutation.mutateAsync({ id, data: { lu: true, resolute: true } });
      toast({ title: "Succès", description: "Alerte marquée comme résolue" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!alertToDelete) return;
    try {
      await deleteAlerteMutation.mutateAsync(alertToDelete.id);
      toast({ title: "Succès", description: "Alerte supprimée" });
      setDeleteDialogOpen(false);
      setAlertToDelete(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  // Stats
  const stats = {
    total: alertes?.length || 0,
    nonLues: alertes?.filter((a) => !a.lu).length || 0,
    hautes: alertes?.filter((a) => a.priority === "HAUTE" && !a.resolute).length || 0,
    resolues: alertes?.filter((a) => a.resolute).length || 0,
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total alertes</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{stats.nonLues}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Non lues</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{stats.hautes}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Priorité haute</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.resolues}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Résolues</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les alertes</SelectItem>
                <SelectItem value="unread">Non lues</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="resolved">Résolues</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              <SelectItem value="HAUTE">Haute</SelectItem>
              <SelectItem value="MOYENNE">Moyenne</SelectItem>
              <SelectItem value="BASSE">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckDocuments}
          disabled={checkDocumentAlertsMutation.isPending}
        >
          {checkDocumentAlertsMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSearch className="mr-2 h-4 w-4" />
          )}
          Vérifier les alertes
        </Button>
      </div>

      {/* Alerts List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        {alertes && alertes.length > 0 ? (
          <div className="space-y-3 pr-4">
            {alertes.map((alerte) => (
              <AlertItem
                key={alerte.id}
                alerte={alerte}
                onMarkRead={() => handleMarkRead(alerte.id)}
                onResolve={() => handleResolve(alerte.id)}
                onDelete={() => {
                  setAlertToDelete(alerte);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Aucune alerte à afficher
              </p>
              <p className="text-muted-foreground text-sm text-center mt-1">
                Les alertes importantes apparaîtront ici
              </p>
            </CardContent>
          </Card>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'alerte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette alerte ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAlerteMutation.isPending}
            >
              {deleteAlerteMutation.isPending && (
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

export default AlertesContent;
