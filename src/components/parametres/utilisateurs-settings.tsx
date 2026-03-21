"use client"

import * as React from "react"
import { useState } from "react"
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Shield,
  Mail,
  User,
  CheckCircle,
  XCircle,
  Key,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  useUtilisateurs,
  useCreateUtilisateur,
  useUpdateUtilisateur,
  useDeleteUtilisateur,
  type Utilisateur,
} from "@/hooks/use-queries"
import { useAuth } from "@/lib/auth-context"

// Role labels
const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur",
  COMPTABLE: "Comptable",
  EXPLOITATION: "Exploitation",
}

// Role colors
const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  COMPTABLE: "bg-blue-100 text-blue-700",
  EXPLOITATION: "bg-green-100 text-green-700",
}

// Role descriptions
const roleDescriptions: Record<string, string> = {
  ADMIN: "Accès total à toutes les fonctionnalités",
  COMPTABLE: "Facturation, paiements et charges",
  EXPLOITATION: "Chauffeurs, véhicules et services",
}

export function UtilisateursSettings() {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  
  // State for dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    motDePasse: "",
    nom: "",
    prenom: "",
    role: "EXPLOITATION",
    actif: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Queries
  const { data: utilisateurs = [], isLoading } = useUtilisateurs()
  const createMutation = useCreateUtilisateur()
  const updateMutation = useUpdateUtilisateur()
  const deleteMutation = useDeleteUtilisateur()

  // Reset form
  const resetForm = () => {
    setFormData({
      email: "",
      motDePasse: "",
      nom: "",
      prenom: "",
      role: "EXPLOITATION",
      actif: true,
    })
    setShowPassword(false)
  }

  // Open add dialog
  const handleAddOpen = () => {
    resetForm()
    setAddDialogOpen(true)
  }

  // Open edit dialog
  const handleEditOpen = (user: Utilisateur) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      motDePasse: "",
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
    })
    setEditDialogOpen(true)
  }

  // Open delete dialog
  const handleDeleteOpen = (user: Utilisateur) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  // Handle add user
  const handleAdd = async () => {
    if (!formData.email || !formData.motDePasse || !formData.nom || !formData.prenom) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    if (formData.motDePasse.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        email: formData.email,
        motDePasse: formData.motDePasse,
        nom: formData.nom,
        prenom: formData.prenom,
        role: formData.role,
      })
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      })
      setAddDialogOpen(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de l'utilisateur",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit user
  const handleEdit = async () => {
    if (!selectedUser) return
    
    if (!formData.email || !formData.nom || !formData.prenom) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    if (formData.motDePasse && formData.motDePasse.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id: selectedUser.id,
        data: {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          role: formData.role,
          actif: formData.actif,
          motDePasse: formData.motDePasse || undefined,
        },
      })
      toast({
        title: "Succès",
        description: "Utilisateur modifié avec succès",
      })
      setEditDialogOpen(false)
      setSelectedUser(null)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification de l'utilisateur",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete user
  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      await deleteMutation.mutateAsync(selectedUser.id)
      toast({
        title: "Succès",
        description: "Utilisateur supprimé avec succès",
      })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de l'utilisateur",
        variant: "destructive",
      })
    }
  }

  // Handle toggle active status
  const handleToggleActive = async (user: Utilisateur) => {
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: { actif: !user.actif },
      })
      toast({
        title: "Succès",
        description: `Utilisateur ${!user.actif ? 'activé' : 'désactivé'} avec succès`,
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion des utilisateurs
          </h3>
          <p className="text-sm text-muted-foreground">
            Gérez les utilisateurs et leurs droits d&apos;accès
          </p>
        </div>
        <Button
          onClick={handleAddOpen}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Roles Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Droits d&apos;accès par rôle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <Badge className={roleColors[role]}>{label}</Badge>
                <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des utilisateurs</CardTitle>
          <CardDescription>
            {utilisateurs.length} utilisateur{utilisateurs.length > 1 ? 's' : ''} enregistré{utilisateurs.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : utilisateurs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Aucun utilisateur enregistré</p>
            </div>
          ) : (
            <div className="space-y-4">
              {utilisateurs.map((user) => (
                <div
                  key={user.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg transition-colors ${
                    !user.actif ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">
                          {user.prenom} {user.nom}
                        </h4>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">
                            Vous
                          </Badge>
                        )}
                        {!user.actif && (
                          <Badge variant="secondary" className="text-xs">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={roleColors[user.role]}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditOpen(user)}
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(user)}
                            title={user.actif ? "Désactiver" : "Activer"}
                          >
                            {user.actif ? (
                              <XCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteOpen(user)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Créez un nouveau compte utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.motDePasse}
                  onChange={(e) => setFormData(prev => ({ ...prev, motDePasse: e.target.value }))}
                  placeholder="Min. 6 caractères"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors.ADMIN}>Administrateur</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="COMPTABLE">
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors.COMPTABLE}>Comptable</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="EXPLOITATION">
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors.EXPLOITATION}>Exploitation</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l&apos;utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l&apos;utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prenom">Prénom *</Label>
                <Input
                  id="edit-prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom *</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.motDePasse}
                  onChange={(e) => setFormData(prev => ({ ...prev, motDePasse: e.target.value }))}
                  placeholder="Laisser vide pour ne pas modifier"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Laisser vide pour conserver le mot de passe actuel
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rôle</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors.ADMIN}>Administrateur</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="COMPTABLE">
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors.COMPTABLE}>Comptable</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="EXPLOITATION">
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors.EXPLOITATION}>Exploitation</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUser?.id !== currentUser?.id && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Compte actif</Label>
                  <p className="text-xs text-muted-foreground">
                    L&apos;utilisateur peut se connecter
                  </p>
                </div>
                <Switch
                  checked={formData.actif}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l&apos;utilisateur{" "}
              <strong>{selectedUser?.prenom} {selectedUser?.nom}</strong> ?
              <br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default UtilisateursSettings
