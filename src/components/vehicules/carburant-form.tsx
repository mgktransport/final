"use client"

import * as React from "react"
import { Fuel, Loader2, Pencil } from "lucide-react"
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

interface CarburantFormProps {
  vehiculeId: string
  vehiculeKilometrage: number
  dernierPleinKm: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingId?: string | null
}

export function CarburantForm({ 
  vehiculeId, 
  vehiculeKilometrage, 
  dernierPleinKm, 
  open, 
  onOpenChange, 
  onSuccess,
  editingId 
}: CarburantFormProps) {
  const [loading, setLoading] = React.useState(false)
  const [loadingPlein, setLoadingPlein] = React.useState(false)
  const [formData, setFormData] = React.useState({
    quantite: "",
    prixTotal: "",
    kilometrage: "",
    station: "",
    date: new Date().toISOString().split('T')[0],
  })

  // Charger les données du plein si mode édition
  React.useEffect(() => {
    const fetchPlein = async () => {
      if (open && editingId) {
        setLoadingPlein(true)
        try {
          const response = await fetch(`/api/carburant/${editingId}`)
          const data = await response.json()
          if (data.success && data.data) {
            const plein = data.data
            setFormData({
              quantite: plein.quantite.toString(),
              prixTotal: plein.prixTotal.toString(),
              kilometrage: plein.kilometrage?.toString() || "",
              station: plein.station || "",
              date: new Date(plein.date).toISOString().split('T')[0],
            })
          }
        } catch (error) {
          console.error("Erreur chargement plein:", error)
        } finally {
          setLoadingPlein(false)
        }
      }
    }
    fetchPlein()
  }, [open, editingId])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        quantite: "",
        prixTotal: "",
        kilometrage: "",
        station: "",
        date: new Date().toISOString().split('T')[0],
      })
    }
  }, [open])

  // Calculer le km minimum
  const minKm = dernierPleinKm || vehiculeKilometrage || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.quantite || !formData.prixTotal || !formData.date) {
      return
    }

    // Validation du kilométrage pour nouveau plein
    if (!editingId && formData.kilometrage) {
      const km = parseInt(formData.kilometrage)
      if (minKm > 0 && km <= minKm) {
        return
      }
    }

    setLoading(true)
    try {
      if (editingId) {
        // Mode édition
        const response = await fetch(`/api/carburant/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantite: parseFloat(formData.quantite),
            prixTotal: parseFloat(formData.prixTotal),
            kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : 0,
            station: formData.station || null,
            date: formData.date,
          }),
        })

        if (response.ok) {
          onSuccess()
          onOpenChange(false)
        }
      } else {
        // Mode création
        const response = await fetch(`/api/vehicules/${vehiculeId}/carburant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantite: parseFloat(formData.quantite),
            prixTotal: parseFloat(formData.prixTotal),
            kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : 0,
            station: formData.station || null,
            date: formData.date,
          }),
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

  // Calculer le prix unitaire pour affichage
  const prixUnitaire = formData.quantite && formData.prixTotal
    ? (parseFloat(formData.prixTotal) / parseFloat(formData.quantite)).toFixed(2)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingId ? (
              <>
                <Pencil className="h-5 w-5 text-[#0066cc]" />
                Modifier le plein
              </>
            ) : (
              <>
                <Fuel className="h-5 w-5 text-[#0066cc]" />
                Ajouter un plein
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {editingId 
              ? "Modifiez les informations du plein de carburant."
              : "Enregistrez un nouveau plein de carburant."
            }
          </DialogDescription>
        </DialogHeader>

        {loadingPlein ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantite">Quantité (L) *</Label>
                <Input
                  id="quantite"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.quantite}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantite: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prixTotal">Montant total (MAD) *</Label>
                <Input
                  id="prixTotal"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.prixTotal}
                  onChange={(e) => setFormData(prev => ({ ...prev, prixTotal: e.target.value }))}
                  required
                />
              </div>
            </div>

            {prixUnitaire && (
              <p className="text-sm text-muted-foreground">
                Prix unitaire: <span className="font-medium">{prixUnitaire} DH/L</span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kilometrage">Kilométrage *</Label>
                <Input
                  id="kilometrage"
                  type="number"
                  placeholder={minKm > 0 ? `Min: ${(minKm + 1).toLocaleString()}` : "0"}
                  value={formData.kilometrage}
                  onChange={(e) => setFormData(prev => ({ ...prev, kilometrage: e.target.value }))}
                  required
                />
              </div>
            </div>

            {minKm > 0 && !editingId && (
              <p className="text-xs text-muted-foreground">
                Le kilométrage doit être supérieur à {minKm.toLocaleString()} km
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Input
                id="station"
                placeholder="Nom de la station (optionnel)"
                value={formData.station}
                onChange={(e) => setFormData(prev => ({ ...prev, station: e.target.value }))}
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
                disabled={loading || !formData.quantite || !formData.prixTotal || !formData.kilometrage}
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
