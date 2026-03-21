"use client"

import * as React from "react"
import { useState } from "react"
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Wrench,
} from "lucide-react"
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
import { Label } from "@/components/ui/label"

interface TypeEntretienPersonnalise {
  id: string
  code: string
  nom: string
  description: string | null
  actif: boolean
}

// Types d'entretien prédéfinis
const TYPES_PREDEFINIS = [
  { code: 'VIDANGE', nom: 'Vidange', description: "Changement d'huile et filtre" },
  { code: 'PNEUS', nom: 'Pneus', description: 'Remplacement ou réparation des pneus' },
  { code: 'FREINS', nom: 'Freins', description: 'Entretien du système de freinage' },
  { code: 'ASSURANCE_VEHICULE', nom: 'Assurance véhicule', description: "Renouvellement de l'assurance" },
  { code: 'VISITE_TECHNIQUE', nom: 'Visite technique', description: 'Contrôle technique du véhicule' },
  { code: 'REPARATION', nom: 'Réparation', description: 'Réparation mécanique ou carrosserie' },
]

export function TypesEntretienSettings() {
  const { toast } = useToast()
  const [typesPersonnalises, setTypesPersonnalises] = useState<TypeEntretienPersonnalise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<TypeEntretienPersonnalise | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
  })

  // Load types
  React.useEffect(() => {
    fetchTypes()
  }, [])

  const fetchTypes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/types-entretien')
      const data = await response.json()
      if (data.success) {
        setTypesPersonnalises(data.personnalises || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddType = async () => {
    if (!formData.code || !formData.nom) {
      toast({
        title: "Erreur",
        description: "Le code et le nom sont obligatoires",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/types-entretien', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          nom: formData.nom,
          description: formData.description || null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Succès", description: "Type d'entretien ajouté avec succès" })
        setAddDialogOpen(false)
        setFormData({ code: '', nom: '', description: '' })
        fetchTypes()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de l'ajout",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditType = async () => {
    if (!selectedType || !formData.nom) {
      toast({
        title: "Erreur",
        description: "Le nom est obligatoire",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/types-entretien/${selectedType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formData.nom,
          description: formData.description || null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Succès", description: "Type d'entretien modifié avec succès" })
        setEditDialogOpen(false)
        setSelectedType(null)
        fetchTypes()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de la modification",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteType = async () => {
    if (!selectedType) return

    setSaving(true)
    try {
      const response = await fetch(`/api/types-entretien/${selectedType.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Succès", description: data.message || "Type d'entretien supprimé avec succès" })
        setDeleteDialogOpen(false)
        setSelectedType(null)
        fetchTypes()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de la suppression",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (type: TypeEntretienPersonnalise) => {
    setSelectedType(type)
    setFormData({
      code: type.code,
      nom: type.nom,
      description: type.description || '',
    })
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Types d&apos;entretien
          </h3>
          <p className="text-sm text-muted-foreground">
            Gérez les types d&apos;entretien pour vos véhicules
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ code: '', nom: '', description: '' })
            setAddDialogOpen(true)
          }}
          className="bg-[#0066cc] hover:bg-[#0052a3]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un type
        </Button>
      </div>

      {/* Types prédéfinis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Types prédéfinis</CardTitle>
          <CardDescription>
            Types d&apos;entretien standards disponibles par défaut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {TYPES_PREDEFINIS.map((type) => (
              <div
                key={type.code}
                className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{type.nom}</span>
                </div>
                {type.description && (
                  <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Types personnalisés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Types personnalisés</CardTitle>
          <CardDescription>
            Types d&apos;entretien ajoutés manuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : typesPersonnalises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun type personnalisé</p>
              <p className="text-xs mt-1">Cliquez sur &quot;Ajouter un type&quot; pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {typesPersonnalises.map((type) => (
                <div
                  key={type.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${!type.actif ? 'opacity-60 bg-muted/50' : 'bg-card'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#0066cc]/10">
                      <Wrench className="h-5 w-5 text-[#0066cc]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{type.nom}</span>
                        {!type.actif && (
                          <Badge variant="secondary" className="text-xs">Inactif</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">Personnalisé</Badge>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        Code: {type.code}
                      </p>
                      {type.description && (
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(type)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedType(type)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un type d&apos;entretien</DialogTitle>
            <DialogDescription>
              Créez un nouveau type d&apos;entretien personnalisé
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="Ex: COURROIE"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Lettres majuscules, chiffres et underscores uniquement
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                placeholder="Ex: Courroie de distribution"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description optionnelle..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddType}
              disabled={saving || !formData.code || !formData.nom}
              className="bg-[#0066cc] hover:bg-[#0052a3]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type d&apos;entretien</DialogTitle>
            <DialogDescription>
              Modifiez les informations du type d&apos;entretien
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                disabled
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Le code ne peut pas être modifié
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nom">Nom *</Label>
              <Input
                id="edit-nom"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleEditType}
              disabled={saving || !formData.nom}
              className="bg-[#0066cc] hover:bg-[#0052a3]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le type d&apos;entretien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le type &quot;{selectedType?.nom}&quot; ?
              <br />
              {selectedType && (
                <span className="text-sm text-muted-foreground">
                  Si ce type est utilisé dans des entretiens, il sera désactivé au lieu d&apos;être supprimé.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteType}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
