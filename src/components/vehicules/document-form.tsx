"use client"

import * as React from "react"
import { FileText, Loader2 } from "lucide-react"
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

interface DocumentFormProps {
  vehiculeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const typesDocument = [
  { value: "ASSURANCE", label: "Assurance" },
  { value: "VISITE_TECHNIQUE", label: "Visite technique" },
  { value: "CARTE_GRISE", label: "Carte grise" },
  { value: "AUTRE", label: "Autre" },
]

export function DocumentForm({ vehiculeId, open, onOpenChange, onSuccess }: DocumentFormProps) {
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    type: "",
    numero: "",
    dateEmission: "",
    dateExpiration: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type) {
      return
    }

    setLoading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("type", formData.type)
      formDataToSend.append("numero", formData.numero || "")
      formDataToSend.append("dateEmission", formData.dateEmission || "")
      formDataToSend.append("dateExpiration", formData.dateExpiration || "")

      const response = await fetch(`/api/vehicules/${vehiculeId}/documents`, {
        method: "POST",
        body: formDataToSend,
      })

      if (response.ok) {
        // Reset form
        setFormData({
          type: "",
          numero: "",
          dateEmission: "",
          dateExpiration: "",
        })
        onSuccess()
        onOpenChange(false)
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
            <FileText className="h-5 w-5 text-[#0066cc]" />
            Ajouter un document
          </DialogTitle>
          <DialogDescription>
            Enregistrez un nouveau document pour ce véhicule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type de document *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {typesDocument.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Numéro / Référence</Label>
            <Input
              id="numero"
              type="text"
              placeholder="N° du document"
              value={formData.numero}
              onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateEmission">Date d&apos;émission</Label>
              <Input
                id="dateEmission"
                type="date"
                value={formData.dateEmission}
                onChange={(e) => setFormData(prev => ({ ...prev, dateEmission: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateExpiration">Date d&apos;expiration</Label>
              <Input
                id="dateExpiration"
                type="date"
                value={formData.dateExpiration}
                onChange={(e) => setFormData(prev => ({ ...prev, dateExpiration: e.target.value }))}
              />
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
              disabled={loading || !formData.type}
              className="bg-[#0066cc] hover:bg-[#0052a3]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
