"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
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
  Truck,
  MapPin,
  Clock,
  Building2,
  Phone,
  CheckCircle,
  Circle,
  Calendar,
  Car,
  User,
  RefreshCw,
  Eye,
  X,
  Lock,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { NewExploitationModal } from "./new-exploitation-modal";
import { EditExploitationModal } from "./edit-exploitation-modal";

// Types
interface ChauffeurProfile {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  cin: string;
  vehicules: Array<{
    id: string;
    immatriculation: string;
    marque: string;
    modele: string;
  }>;
}

interface ChauffeurService {
  id: string;
  dateHeureDepart: Date | string;
  nombreSalaries: number;
  completed: boolean;
  notes: string | null;
  client: {
    id: string;
    nomEntreprise: string;
    telephone: string;
    adresse: string | null;
  };
  service: {
    id: string;
    nomService: string;
    lieuDepart: string | null;
    lieuArrive: string | null;
    heureDepart: string | null;
  };
  vehicule: {
    id: string;
    immatriculation: string;
    marque: string;
    modele: string;
  };
}

// Fetch functions
async function fetchChauffeurProfile(): Promise<ChauffeurProfile> {
  const res = await fetch("/api/chauffeur/me");
  if (!res.ok) throw new Error("Erreur lors de la récupération du profil");
  const data = await res.json();
  return data.data;
}

async function fetchChauffeurServices(params: { today?: boolean; completed?: boolean }): Promise<{ data: ChauffeurService[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.today) searchParams.append("today", "true");
  if (params.completed !== undefined) searchParams.append("completed", String(params.completed));
  
  const res = await fetch(`/api/chauffeur/services?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Erreur lors de la récupération des services");
  return res.json();
}

async function updateServiceStatus(id: string, completed: boolean, notes?: string): Promise<ChauffeurService> {
  const res = await fetch(`/api/chauffeur/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed, notes }),
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour");
  const data = await res.json();
  return data.data;
}

async function deleteExploitation(id: string): Promise<void> {
  const res = await fetch(`/api/chauffeur/exploitations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erreur lors de la suppression");
  }
}

// Format time
function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Service Card Component
function ServiceCard({
  service,
  onComplete,
  onEdit,
  onDelete,
  isUpdating,
}: {
  service: ChauffeurService;
  onComplete: (id: string, completed: boolean) => void;
  onEdit: (service: ChauffeurService) => void;
  onDelete: (service: ChauffeurService) => void;
  isUpdating: boolean;
}) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <>
      <Card className={`${service.completed ? "bg-green-50 border-green-200" : "bg-white"}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {service.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
                {service.service.nomService}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {service.client.nomEntreprise}
              </CardDescription>
            </div>
            <Badge variant={service.completed ? "default" : "secondary"} className={service.completed ? "bg-green-600" : ""}>
              {service.completed ? "Confirmé" : "En attente"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTime(service.dateHeureDepart)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{service.nombreSalaries} salarié(s)</span>
            </div>
            {service.service.lieuDepart && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span>{service.service.lieuDepart}</span>
                {service.service.lieuArrive && (
                  <>
                    <span className="text-gray-400">→</span>
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span>{service.service.lieuArrive}</span>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4" />
              <span>{service.vehicule.immatriculation}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{service.client.telephone}</span>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            {!service.completed ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(service)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(service)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowDetails(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Détails
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Détails du service</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDetails(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="font-semibold">{service.client.nomEntreprise}</p>
                {service.client.adresse && (
                  <p className="text-sm text-muted-foreground">{service.client.adresse}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service</p>
                <p>{service.service.nomService}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Départ</p>
                  <p>{service.service.lieuDepart || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Arrivée</p>
                  <p>{service.service.lieuArrive || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Heure</p>
                  <p>{formatTime(service.dateHeureDepart)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Passagers</p>
                  <p>{service.nombreSalaries} salarié(s)</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Véhicule</p>
                <p>{service.vehicule.marque} {service.vehicule.modele} ({service.vehicule.immatriculation})</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact client</p>
                <p>{service.client.telephone}</p>
              </div>
              {service.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p>{service.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function ChauffeurDashboard() {
  const { user, logout, clearMustChangePassword } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showTodayOnly, setShowTodayOnly] = React.useState(true);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showNewExploitationModal, setShowNewExploitationModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<ChauffeurService | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [serviceToDelete, setServiceToDelete] = React.useState<ChauffeurService | null>(null);

  // Auto-show password modal if user must change password
  React.useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [user?.mustChangePassword]);

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["chauffeur-profile"],
    queryFn: fetchChauffeurProfile,
  });

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading, refetch } = useQuery({
    queryKey: ["chauffeur-services", showTodayOnly],
    queryFn: () => fetchChauffeurServices({ today: showTodayOnly }),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => 
      updateServiceStatus(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chauffeur-services"] });
      toast({ title: "Succès", description: "Service mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExploitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chauffeur-services"] });
      toast({ title: "Succès", description: "Service supprimé" });
      setShowDeleteDialog(false);
      setServiceToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleComplete = (id: string, completed: boolean) => {
    updateMutation.mutate({ id, completed });
  };

  const handleEdit = (service: ChauffeurService) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleDeleteClick = (service: ChauffeurService) => {
    setServiceToDelete(service);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (serviceToDelete) {
      deleteMutation.mutate(serviceToDelete.id);
    }
  };

  const todayDate = formatDate(new Date());
  const pendingServices = servicesData?.data?.filter(s => !s.completed) || [];
  const completedServices = servicesData?.data?.filter(s => s.completed) || [];

  if (profileLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0066cc] to-[#003d7a] text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">MGK Transport</h1>
                <p className="text-sm text-white/80">Espace Chauffeur</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{profile?.nom} {profile?.prenom}</p>
                <p className="text-xs text-white/80">{profile?.telephone}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPasswordModal(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Mot de passe
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Mon Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nom complet</p>
                <p className="font-medium">{profile?.nom} {profile?.prenom}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Téléphone</p>
                <p className="font-medium">{profile?.telephone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CIN</p>
                <p className="font-medium">{profile?.cin}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Véhicule(s)</p>
                <p className="font-medium">{profile?.vehicules?.length || 0} assigné(s)</p>
              </div>
            </div>
            {profile?.vehicules && profile.vehicules.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Véhicules assignés:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.vehicules.map((v) => (
                    <Badge key={v.id} variant="outline" className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {v.immatriculation} - {v.marque} {v.modele}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {showTodayOnly ? "Services du jour" : "Tous mes services"}
              </h2>
              <p className="text-sm text-muted-foreground">{todayDate}</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                size="sm"
                onClick={() => setShowNewExploitationModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button
                variant={showTodayOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTodayOnly(!showTodayOnly)}
              >
                {showTodayOnly ? "Voir tout" : "Aujourd'hui"}
              </Button>
            </div>
          </div>

          {servicesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : servicesData?.data?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Aucun service prévu</h3>
                <p className="text-muted-foreground">
                  {showTodayOnly 
                    ? "Vous n'avez pas de service prévu aujourd'hui"
                    : "Aucun service à afficher"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Pending Services */}
              {pendingServices.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-orange-600 flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    En attente ({pendingServices.length})
                  </h3>
                  {pendingServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onComplete={handleComplete}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      isUpdating={updateMutation.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Completed Services */}
              {completedServices.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Confirmés ({completedServices.length})
                  </h3>
                  {completedServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onComplete={handleComplete}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      isUpdating={updateMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {!servicesLoading && servicesData?.data && (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{servicesData.data.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{pendingServices.length}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{completedServices.length}</p>
                  <p className="text-sm text-muted-foreground">Confirmés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={showPasswordModal} 
        onSuccess={() => {
          setShowPasswordModal(false);
          clearMustChangePassword();
        }}
      />

      {/* New Exploitation Modal */}
      <NewExploitationModal
        open={showNewExploitationModal}
        onOpenChange={setShowNewExploitationModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["chauffeur-services"] });
          toast({ title: "Succès", description: "Service enregistré avec succès" });
        }}
      />

      {/* Edit Exploitation Modal */}
      <EditExploitationModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        exploitation={selectedService ? {
          id: selectedService.id,
          clientId: selectedService.client.id,
          serviceId: selectedService.service.id,
          vehiculeId: selectedService.vehicule.id,
          dateHeureDepart: String(selectedService.dateHeureDepart),
          nombreSalaries: selectedService.nombreSalaries,
          notes: selectedService.notes,
        } : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["chauffeur-services"] });
          toast({ title: "Succès", description: "Service modifié avec succès" });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce service ? Cette action est irréversible.
              {serviceToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <p><strong>Client:</strong> {serviceToDelete.client.nomEntreprise}</p>
                  <p><strong>Service:</strong> {serviceToDelete.service.nomService}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
