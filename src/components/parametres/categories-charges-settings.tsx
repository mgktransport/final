"use client"

import * as React from "react"
import { Plus, Edit, Trash2, Loader2, CreditCard, Truck, Building2, Lock, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Types
interface CategorieCharge {
  id: string
  code: string
  nom: string
  type: 'VEHICULE' | 'SOCIETE'
  description?: string | null
  actif: boolean
  automatique: boolean
  createdAt?: Date
  updatedAt?: Date
}

// API functions
async function fetchCategories(type?: string) {
  const url = type ? `/api/categories-charges?type=${type}` : '/api/categories-charges'
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.data as CategorieCharge[]
}

async function createCategorie(data: { code: string; nom: string; type: string; description?: string }) {
  const response = await fetch('/api/categories-charges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function updateCategorie(id: string, data: Partial<{ code: string; nom: string; type: string; description: string; actif: boolean }>) {
  const response = await fetch(`/api/categories-charges/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function deleteCategorie(id: string) {
  const response = await fetch(`/api/categories-charges/${id}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result
}

// Category Card Component
function CategorieCard({
  categorie,
  onEdit,
  onDelete,
}: {
  categorie: CategorieCharge
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${!categorie.actif ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${categorie.type === 'VEHICULE' ? 'bg-blue-100' : 'bg-orange-100'}`}>
              {categorie.type === 'VEHICULE' ? (
                <Truck className="h-5 w-5 text-blue-600" />
              ) : (
                <Building2 className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{categorie.nom}</h4>
                {!categorie.actif && (
                  <Badge variant="secondary" className="text-xs">Inactif</Badge>
                )}
                {categorie.automatique && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Code: {categorie.code}
              </p>
              {categorie.description && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {categorie.description}
                </p>
              )}
            </div>
          </div>
          {!categorie.automatique && (
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
          )}
          {categorie.automatique && (
            <div className="flex items-center gap-1 text-purple-600">
              <Lock className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Component
export function CategoriesChargesSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedCategorie, setSelectedCategorie] = React.useState<CategorieCharge | null>(null)
  const [filterType, setFilterType] = React.useState<string>('all')
  
  // Form state
  const [formData, setFormData] = React.useState({
    code: '',
    nom: '',
    type: 'VEHICULE' as 'VEHICULE' | 'SOCIETE',
    description: '',
  })

  // Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-charges', filterType],
    queryFn: () => fetchCategories(filterType === 'all' ? undefined : filterType),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCategorie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-charges'] })
      toast({ title: "Succès", description: "Catégorie créée avec succès" })
      setAddDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategorie>[1] }) => 
      updateCategorie(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-charges'] })
      toast({ title: "Succès", description: "Catégorie modifiée avec succès" })
      setEditDialogOpen(false)
      setSelectedCategorie(null)
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategorie,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories-charges'] })
      toast({ title: "Succès", description: data.message || "Catégorie supprimée avec succès" })
      setDeleteDialogOpen(false)
      setSelectedCategorie(null)
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    },
  })

  const resetForm = () => {
    setFormData({ code: '', nom: '', type: 'VEHICULE', description: '' })
  }

  const handleAdd = () => {
    if (!formData.code || !formData.nom) {
      toast({ title: "Erreur", description: "Code et nom sont obligatoires", variant: "destructive" })
      return
    }
    createMutation.mutate({
      code: formData.code,
      nom: formData.nom,
      type: formData.type,
      description: formData.description || undefined,
    })
  }

  const handleEdit = () => {
    if (!selectedCategorie) return
    updateMutation.mutate({
      id: selectedCategorie.id,
      data: {
        code: formData.code,
        nom: formData.nom,
        type: formData.type,
        description: formData.description || undefined,
      },
    })
  }

  const handleDelete = () => {
    if (!selectedCategorie) return
    deleteMutation.mutate(selectedCategorie.id)
  }

  const openEditDialog = (categorie: CategorieCharge) => {
    setSelectedCategorie(categorie)
    setFormData({
      code: categorie.code,
      nom: categorie.nom,
      type: categorie.type,
      description: categorie.description || '',
    })
    setEditDialogOpen(true)
  }

  // Separate categories by type
  const categoriesVehicule = categories.filter(c => c.type === 'VEHICULE')
  const categoriesSociete = categories.filter(c => c.type === 'SOCIETE')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Catégories de charges
          </h3>
          <p className="text-sm text-muted-foreground">
            Gérez les catégories de charges pour les véhicules et la société
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="VEHICULE">Véhicules</SelectItem>
              <SelectItem value="SOCIETE">Société</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setAddDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Info about automatic categories */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Catégories automatiques
          </CardTitle>
          <CardDescription>
            Ces catégories sont générées automatiquement par le système et ne peuvent pas être modifiées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { nom: 'Carburant', type: 'VEHICULE' },
              { nom: 'Entretien véhicule', type: 'VEHICULE' },
              { nom: 'Achat véhicule', type: 'VEHICULE' },
              { nom: 'Échéance crédit', type: 'VEHICULE' },
              { nom: 'Salaires', type: 'SOCIETE' },
              { nom: 'Charges sociales', type: 'SOCIETE' },
            ].map((cat) => (
              <div key={cat.nom} className="flex items-center gap-2 p-2 bg-white rounded border">
                {cat.type === 'VEHICULE' ? (
                  <Truck className="h-4 w-4 text-blue-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-orange-600" />
                )}
                <span className="text-sm">{cat.nom}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Véhicules */}
          {categoriesVehicule.length > 0 && (filterType === 'all' || filterType === 'VEHICULE') && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Catégories Véhicules ({categoriesVehicule.length})
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {categoriesVehicule.map((cat) => (
                  <CategorieCard
                    key={cat.id}
                    categorie={cat}
                    onEdit={() => openEditDialog(cat)}
                    onDelete={() => { setSelectedCategorie(cat); setDeleteDialogOpen(true); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Société */}
          {categoriesSociete.length > 0 && (filterType === 'all' || filterType === 'SOCIETE') && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-600" />
                Catégories Société ({categoriesSociete.length})
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {categoriesSociete.map((cat) => (
                  <CategorieCard
                    key={cat.id}
                    categorie={cat}
                    onEdit={() => openEditDialog(cat)}
                    onDelete={() => { setSelectedCategorie(cat); setDeleteDialogOpen(true); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {categories.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground text-center">
                  Aucune catégorie personnalisée
                </p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Créez des catégories pour organiser vos charges
                </p>
                <Button onClick={() => { resetForm(); setAddDialogOpen(true); }} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une catégorie
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une catégorie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle catégorie de charge
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                placeholder="EX: ASSURANCE_VEHICULE"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
              />
              <p className="text-xs text-muted-foreground">
                Lettres majuscules, chiffres et underscores uniquement
              </p>
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                placeholder="Ex: Assurance véhicule"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(value: 'VEHICULE' | 'SOCIETE') => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VEHICULE">Véhicule</SelectItem>
                  <SelectItem value="SOCIETE">Société</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Description optionnelle..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la catégorie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                placeholder="EX: ASSURANCE_VEHICULE"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                placeholder="Ex: Assurance véhicule"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(value: 'VEHICULE' | 'SOCIETE') => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VEHICULE">Véhicule</SelectItem>
                  <SelectItem value="SOCIETE">Société</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Description optionnelle..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie &quot;{selectedCategorie?.nom}&quot; ?
              Si des charges utilisent cette catégorie, elle sera désactivée au lieu d&apos;être supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
