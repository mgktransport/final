"use client"

import * as React from "react"
import { Wrench, Loader2, Pencil, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EntretienFormProps {
  vehiculeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingId?: string | null
}

interface TypeEntretien {
  code: string
  nom: string
  description?: string | null
  personnalise: boolean
  id?: string
}

export function EntretienForm({ vehiculeId, open, onOpenChange, onSuccess, editingId }: EntretienFormProps) {
  const [loading, setLoading] = React.useState(false)
  const [loadingTypes, setLoadingTypes] = React.useState(false)
  const [loadingEntretien, setLoadingEntretien] = React.useState(false)
  const [typesEntretien, setTypesEntretien] = React.useState<TypeEntretien[]>([])
  const [dernierKmVidange, setDernierKmVidange] = React.useState<number | null>(null)
  const [kmVehicule, setKmVehicule] = React.useState<number | null>(null)
  const [formData, setFormData] = React.useState({
    type: "",
    description: "",
    cout: "",
    kilometrage: "",
    dateIntervention: new Date().toISOString().split('T')[0],
    prochainKm: "",
    prochaineDate: "",
  })

  // Check if current type is VIDANGE
  const isVidange = formData.type === "VIDANGE"
  
  // Validation errors
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Charger les types d'entretien et le dernier km vidange
  React.useEffect(() => {
    const fetchData = async () => {
      if (open) {
        setLoadingTypes(true)
        try {
          // Charger les types
          const response = await fetch("/api/types-entretien")
          const data = await response.json()
          if (data.success) {
            setTypesEntretien(data.data)
          }
          
          // Charger le kilométrage du véhicule
          const vehiculeResponse = await fetch(`/api/vehicules/${vehiculeId}`)
          const vehiculeData = await vehiculeResponse.json()
          if (vehiculeData.success && vehiculeData.data) {
            setKmVehicule(vehiculeData.data.kilometrage)
          }
          
          // Charger le dernier km vidange si nouveau formulaire (pas édition)
          if (!editingId) {
            const lastVidangeResponse = await fetch(`/api/vehicules/${vehiculeId}/entretiens/last-vidange`)
            const lastVidangeData = await lastVidangeResponse.json()
            if (lastVidangeData.success && lastVidangeData.data) {
              setDernierKmVidange(lastVidangeData.data.kilometrage)
            } else {
              setDernierKmVidange(null)
            }
          }
        } catch (error) {
          console.error("Erreur chargement:", error)
        } finally {
          setLoadingTypes(false)
        }
      }
    }
    fetchData()
  }, [open, vehiculeId, editingId])

  // Pré-remplir le kilométrage quand le type est VIDANGE
  React.useEffect(() => {
    if (formData.type === "VIDANGE" && !editingId && dernierKmVidange) {
      setFormData(prev => ({
        ...prev,
        kilometrage: dernierKmVidange.toString(),
        prochainKm: "" // Reset prochainKm pour que l'utilisateur le saisisse
      }))
    } else if (formData.type !== "VIDANGE") {
      // Clear errors when type changes from VIDANGE
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.kilometrage
        delete newErrors.prochainKm
        return newErrors
      })
    }
  }, [formData.type, dernierKmVidange, editingId])

  // Charger les données de l'entretien si mode édition
  React.useEffect(() => {
    const fetchEntretien = async () => {
      if (open && editingId) {
        setLoadingEntretien(true)
        try {
          const response = await fetch(`/api/entretiens/${editingId}`)
          const data = await response.json()
          if (data.success && data.data) {
            const entretien = data.data
            setFormData({
              type: entretien.type,
              description: entretien.description || "",
              cout: entretien.cout.toString(),
              kilometrage: entretien.kilometrage?.toString() || "",
              dateIntervention: new Date(entretien.dateIntervention).toISOString().split('T')[0],
              prochainKm: entretien.prochainKm?.toString() || "",
              prochaineDate: entretien.prochaineDate 
                ? new Date(entretien.prochaineDate).toISOString().split('T')[0] 
                : "",
            })
            if (entretien.kilometrage) {
              setDernierKmVidange(entretien.kilometrage)
            }
          }
        } catch (error) {
          console.error("Erreur chargement entretien:", error)
        } finally {
          setLoadingEntretien(false)
        }
      }
    }
    fetchEntretien()
  }, [open, editingId])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        type: "",
        description: "",
        cout: "",
        kilometrage: "",
        dateIntervention: new Date().toISOString().split('T')[0],
        prochainKm: "",
        prochaineDate: "",
      })
      setErrors({})
      setDernierKmVidange(null)
      setKmVehicule(null)
    }
  }, [open])

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.type) {
      newErrors.type = "Le type d'entretien est obligatoire"
    }
    if (!formData.cout) {
      newErrors.cout = "Le coût est obligatoire"
    }
    if (!formData.dateIntervention) {
      newErrors.dateIntervention = "La date d'intervention est obligatoire"
    }
    
    // Validation spécifique pour VIDANGE
    if (formData.type === "VIDANGE") {
      if (!formData.kilometrage) {
        newErrors.kilometrage = "Le kilométrage est obligatoire pour une vidange"
      } else if (kmVehicule && parseInt(formData.kilometrage) < kmVehicule) {
        newErrors.kilometrage = `Le kilométrage doit être supérieur ou égal à ${kmVehicule.toLocaleString()} km (km actuel du véhicule)`
      }
      if (!formData.prochainKm) {
        newErrors.prochainKm = "Le prochain km est obligatoire pour une vidange"
      } else if (formData.kilometrage && parseInt(formData.prochainKm) <= parseInt(formData.kilometrage)) {
        newErrors.prochainKm = "Le prochain km doit être supérieur au kilométrage actuel"
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        type: formData.type,
        description: formData.description || null,
        cout: parseFloat(formData.cout),
        dateIntervention: formData.dateIntervention,
        prochaineDate: formData.prochaineDate || null,
      }
      
      // Kilometrage et prochainKm obligatoires pour VIDANGE
      if (formData.type === "VIDANGE") {
        body.kilometrage = parseInt(formData.kilometrage)
        body.prochainKm = parseInt(formData.prochainKm)
      } else {
        // Optionnels pour les autres types
        body.kilometrage = formData.kilometrage ? parseInt(formData.kilometrage) : null
        body.prochainKm = formData.prochainKm ? parseInt(formData.prochainKm) : null
      }

      if (editingId) {
        // Mode édition - PUT
        const response = await fetch(`/api/entretiens/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (response.ok) {
          onSuccess()
          onOpenChange(false)
        }
      } else {
        // Mode création - POST
        const response = await fetch(`/api/vehicules/${vehiculeId}/entretiens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (response.ok) {
          onSuccess()
          onOpenChange(false)
        }
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingId ? (
              <>
                <Pencil className="h-5 w-5 text-[#0066cc]" />
                Modifier l&apos;entretien
              </>
            ) : (
              <>
                <Wrench className="h-5 w-5 text-[#0066cc]" />
                Ajouter un entretien
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {editingId 
              ? "Modifiez les informations de l'entretien."
              : "Enregistrez un nouvel entretien pour ce véhicule."
            }
          </DialogDescription>
        </DialogHeader>

        {loadingEntretien ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type d&apos;entretien *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    type: value,
                    // Reset kilometrage if not VIDANGE
                    kilometrage: value === "VIDANGE" ? prev.kilometrage : "",
                    prochainKm: value === "VIDANGE" ? prev.prochainKm : ""
                  }))}
                  disabled={loadingTypes}
                >
                  <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingTypes ? "Chargement..." : "Sélectionner"} />
                  </SelectTrigger>
                  <SelectContent>
                    {typesEntretien.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        <div className="flex items-center gap-2">
                          {type.nom}
                          {type.personnalise && (
                            <Badge variant="outline" className="text-xs ml-1">
                              Perso
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cout">Coût (MAD) *</Label>
                <Input
                  id="cout"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cout}
                  onChange={(e) => setFormData(prev => ({ ...prev, cout: e.target.value }))}
                  className={errors.cout ? "border-red-500" : ""}
                />
                {errors.cout && (
                  <p className="text-sm text-red-500">{errors.cout}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateIntervention">Date d&apos;intervention *</Label>
              <Input
                id="dateIntervention"
                type="date"
                value={formData.dateIntervention}
                onChange={(e) => setFormData(prev => ({ ...prev, dateIntervention: e.target.value }))}
                className={errors.dateIntervention ? "border-red-500" : ""}
              />
              {errors.dateIntervention && (
                <p className="text-sm text-red-500">{errors.dateIntervention}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilometrage">
                Kilométrage {isVidange && "*"}
              </Label>
              <Input
                id="kilometrage"
                type="number"
                placeholder={isVidange 
                  ? (dernierKmVidange 
                      ? `Dernière vidange: ${dernierKmVidange.toLocaleString()} km`
                      : (kmVehicule 
                          ? `Km véhicule: ${kmVehicule.toLocaleString()} km`
                          : "Kilométrage actuel"))
                  : "Kilométrage (optionnel)"
                }
                value={formData.kilometrage}
                onChange={(e) => setFormData(prev => ({ ...prev, kilometrage: e.target.value }))}
                className={errors.kilometrage ? "border-red-500" : ""}
              />
              {errors.kilometrage && (
                <p className="text-sm text-red-500">{errors.kilometrage}</p>
              )}
              {isVidange && !editingId && dernierKmVidange && (
                <p className="text-xs text-muted-foreground">
                  Pré-rempli avec le kilométrage de la dernière vidange
                </p>
              )}
              {isVidange && !editingId && !dernierKmVidange && kmVehicule && (
                <p className="text-xs text-muted-foreground">
                  Premier entretien - Km véhicule: {kmVehicule.toLocaleString()} km
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Détails de l'entretien..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {isVidange && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  Pour une vidange, le kilométrage et le prochain km sont obligatoires.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prochaineDate">Prochaine date</Label>
                <Input
                  id="prochaineDate"
                  type="date"
                  value={formData.prochaineDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, prochaineDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prochainKm">
                  Prochain km {isVidange && "*"}
                </Label>
                <Input
                  id="prochainKm"
                  type="number"
                  placeholder={isVidange ? "Ex: 155000" : "Optionnel"}
                  value={formData.prochainKm}
                  onChange={(e) => setFormData(prev => ({ ...prev, prochainKm: e.target.value }))}
                  className={errors.prochainKm ? "border-red-500" : ""}
                />
                {errors.prochainKm && (
                  <p className="text-sm text-red-500">{errors.prochainKm}</p>
                )}
                {isVidange && formData.kilometrage && (
                  <p className="text-xs text-muted-foreground">
                    Doit être supérieur à {parseInt(formData.kilometrage).toLocaleString()} km
                  </p>
                )}
              </div>
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
                disabled={loading}
                className="bg-[#0066cc] hover:bg-[#0052a3]"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Modifier" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
