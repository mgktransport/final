"use client"

import * as React from "react"
import { Plus, Loader2, Truck, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useVehicules } from "@/hooks/use-queries"
import { cn } from "@/lib/utils"

// Types
type TypeCharge = 'VEHICULE' | 'SOCIETE'

interface CategorieCharge {
  id: string
  code: string
  nom: string
  type: TypeCharge
  description?: string | null
  actif: boolean
  automatique: boolean
}

interface Charge {
  id: string
  type: TypeCharge
  categorie: string
  description: string
  montant: number
  dateCharge: Date | string
  vehiculeId?: string | null
  fournisseur?: string | null
  numeroFacture?: string | null
  notes?: string | null
}

interface ChargeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingCharge?: Charge | null
}

export function ChargeForm({ open, onOpenChange, onSuccess, editingCharge }: ChargeFormProps) {
  const { toast } = useToast()
  const { data: vehiculesData } = useVehicules({ page: 1, pageSize: 100 })
  const vehicules = vehiculesData?.data || []
  const [isLoading, setIsLoading] = React.useState(false)
  const [categories, setCategories] = React.useState<CategorieCharge[]>([])
  const [loadingCategories, setLoadingCategories] = React.useState(false)
  
  const isEditMode = !!editingCharge
  
  const [formData, setFormData] = React.useState({
    type: 'SOCIETE' as TypeCharge,
    categorie: '',
    description: '',
    montant: '',
    dateCharge: new Date().toISOString().split('T')[0],
    vehiculeId: '',
    fournisseur: '',
    numeroFacture: '',
    notes: '',
  })

  // Fetch categories from API
  const fetchCategories = React.useCallback(async () => {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/categories-charges?actif=true')
      const result = await response.json()
      if (result.success) {
        // Filter out automatic categories - only show manual ones
        const manualCategories = result.data.filter((cat: CategorieCharge) => !cat.automatique)
        setCategories(manualCategories)
      }
    } catch (error) {
      console.error("Erreur chargement catégories:", error)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // Load categories when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open, fetchCategories])

  // Load editing data
  React.useEffect(() => {
    if (open && editingCharge) {
      setFormData({
        type: editingCharge.type,
        categorie: editingCharge.categorie,
        description: editingCharge.description,
        montant: editingCharge.montant.toString(),
        dateCharge: new Date(editingCharge.dateCharge).toISOString().split('T')[0],
        vehiculeId: editingCharge.vehiculeId || '',
        fournisseur: editingCharge.fournisseur || '',
        numeroFacture: editingCharge.numeroFacture || '',
        notes: editingCharge.notes || '',
      })
    } else if (open) {
      setFormData({
        type: 'SOCIETE',
        categorie: '',
        description: '',
        montant: '',
        dateCharge: new Date().toISOString().split('T')[0],
        vehiculeId: '',
        fournisseur: '',
        numeroFacture: '',
        notes: '',
      })
    }
  }, [open, editingCharge])
  
  // Update categorie when type changes
  React.useEffect(() => {
    const filteredCategories = categories.filter(cat => cat.type === formData.type && cat.actif)
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.code === formData.categorie)) {
      setFormData(prev => ({ ...prev, categorie: filteredCategories[0].code, vehiculeId: '' }))
    }
  }, [formData.type, categories, formData.categorie])

  // Filter categories by type
  const filteredCategories = React.useMemo(() => {
    return categories.filter(cat => cat.type === formData.type && cat.actif)
  }, [categories, formData.type])

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.description || !formData.montant || !formData.dateCharge || !formData.categorie) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      })
      return
    }

    if (formData.type === 'VEHICULE' && !formData.vehiculeId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un véhicule",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const body = {
        type: formData.type,
        categorie: formData.categorie,
        description: formData.description,
        montant: parseFloat(formData.montant),
        dateCharge: formData.dateCharge,
        vehiculeId: formData.type === 'VEHICULE' ? formData.vehiculeId : null,
        fournisseur: formData.fournisseur || null,
        numeroFacture: formData.numeroFacture || null,
        notes: formData.notes || null,
      }
      
      const url = editingCharge 
        ? `/api/charges/${editingCharge.id}` 
        : '/api/charges'
      
      const method = editingCharge ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Succès",
          description: editingCharge 
            ? "Charge modifiée avec succès" 
            : "Charge ajoutée avec succès",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(result.error || "Erreur lors de l'enregistrement")
      }
    } catch (error: any) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'enregistrement de la charge",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingCharge ? (
              <Building2 className="h-5 w-5 text-[#0066cc]" />
            ) : (
              <Plus className="h-5 w-5 text-[#0066cc]" />
            )}
            {editingCharge ? "Modifier la charge" : "Ajouter une charge"}
          </DialogTitle>
          <DialogDescription>
            {editingCharge
              ? "Modifiez les informations de la charge."
              : "Remplissez les informations de la nouvelle charge."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type de charge */}
          <div className="space-y-2">
            <Label>Type de charge *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === 'VEHICULE' ? 'default' : 'outline'}
                className={cn(
                  "flex-1",
                  formData.type === 'VEHICULE' 
                    ? "bg-[#0066cc] hover:bg-[#0052a3]" 
                    : "border-[#0066cc]"
                )}
                onClick={() => setFormData(prev => ({ ...prev, type: 'VEHICULE' }))}
              >
                <Truck className="h-4 w-4 mr-2" />
                Véhicule
              </Button>
              <Button
                type="button"
                variant={formData.type === 'SOCIETE' ? 'default' : 'outline'}
                className={cn(
                  "flex-1",
                  formData.type === 'SOCIETE' 
                    ? "bg-[#ff6600] hover:bg-[#ff6600]/90 border-[#ff6600]"
                    : "border-[#ff6600]"
                )}
                onClick={() => setFormData(prev => ({ ...prev, type: 'SOCIETE' }))}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Société
              </Button>
            </div>
          </div>
          
          {/* Véhicule (si type VEHICULE) */}
          {formData.type === 'VEHICULE' && (
            <div className="space-y-2">
              <Label>Véhicule associé *</Label>
              <Select 
                value={formData.vehiculeId || ""} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehiculeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.filter((v: any) => v.actif).map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.immatriculation} - {v.marque} {v.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Catégorie */}
          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select 
              value={formData.categorie} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, categorie: value }))}
              disabled={loadingCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCategories ? "Chargement..." : "Sélectionner une catégorie"} />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.code}>{cat.nom}</SelectItem>
                ))}
                {filteredCategories.length === 0 && !loadingCategories && (
                  <SelectItem value="__none" disabled>Aucune catégorie disponible</SelectItem>
                )}
              </SelectContent>
            </Select>
            {filteredCategories.length === 0 && !loadingCategories && (
              <p className="text-xs text-muted-foreground">
                Aucune catégorie configurée. Allez dans Paramètres → Catégories Charges pour en ajouter.
              </p>
            )}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              placeholder="Description de la charge"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          {/* Montant et date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant (DH) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.montant}
                onChange={(e) => setFormData(prev => ({ ...prev, montant: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de la charge *</Label>
              <Input
                type="date"
                value={formData.dateCharge}
                onChange={(e) => setFormData(prev => ({ ...prev, dateCharge: e.target.value }))}
              />
            </div>
          </div>
          
          {/* Fournisseur et Facture */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Input
                placeholder="Nom du fournisseur"
                value={formData.fournisseur}
                onChange={(e) => setFormData(prev => ({ ...prev, fournisseur: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>N° Facture</Label>
              <Input
                placeholder="Numéro de facture"
                value={formData.numeroFacture}
                onChange={(e) => setFormData(prev => ({ ...prev, numeroFacture: e.target.value }))}
              />
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Notes additionnelles..."
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || loadingCategories}
              className="bg-[#0066cc] hover:bg-[#0052a3]"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCharge ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
