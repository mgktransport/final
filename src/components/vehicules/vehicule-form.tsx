"use client"

import * as React from "react"
import { Truck, Loader2, AlertCircle, Upload, FileText, X } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useChauffeurs } from "@/hooks/use-queries"
import { useToast } from "@/hooks/use-toast"

interface VehiculeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingId?: string | null
}

export function VehiculeForm({ open, onOpenChange, onSuccess, editingId }: VehiculeFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [loadingVehicule, setLoadingVehicule] = React.useState(false)
  const [formData, setFormData] = React.useState({
    immatriculation: "",
    marque: "",
    modele: "",
    annee: "",
    typeCarburant: "DIESEL",
    capacite: "",
    kilometrage: "",
    chauffeurId: "",
    actif: true,
    // Carte grise obligatoire
    carteGriseNumero: "",
    carteGriseDateExpiration: "",
  })
  const [carteGriseFile, setCarteGriseFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { data: chauffeursData } = useChauffeurs({ page: 1, pageSize: 100 })
  const chauffeurs = chauffeursData?.data || []
  const isEditMode = !!editingId

  // Charger les données du véhicule si mode édition
  React.useEffect(() => {
    const fetchVehicule = async () => {
      if (open && editingId) {
        setLoadingVehicule(true)
        try {
          const response = await fetch(`/api/vehicules/${editingId}`)
          const data = await response.json()
          if (data.success && data.data) {
            const v = data.data
            // Trouver la carte grise si elle existe
            const carteGrise = v.documents?.find((d: any) => d.type === 'CARTE_GRISE')
            
            setFormData({
              immatriculation: v.immatriculation,
              marque: v.marque,
              modele: v.modele,
              annee: v.annee.toString(),
              typeCarburant: v.typeCarburant || "DIESEL",
              capacite: v.capacite.toString(),
              kilometrage: v.kilometrage?.toString() || "",
              chauffeurId: v.chauffeurId || "",
              actif: v.actif ?? true,
              carteGriseNumero: carteGrise?.numero || "",
              carteGriseDateExpiration: carteGrise?.dateExpiration 
                ? new Date(carteGrise.dateExpiration).toISOString().split('T')[0] 
                : "",
            })
          }
        } catch (error) {
          console.error("Erreur chargement véhicule:", error)
        } finally {
          setLoadingVehicule(false)
        }
      }
    }
    fetchVehicule()
  }, [open, editingId])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        immatriculation: "",
        marque: "",
        modele: "",
        annee: "",
        typeCarburant: "DIESEL",
        capacite: "",
        kilometrage: "",
        chauffeurId: "",
        actif: true,
        carteGriseNumero: "",
        carteGriseDateExpiration: "",
      })
      setCarteGriseFile(null)
    }
  }, [open])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "Le fichier ne doit pas dépasser 5MB",
          variant: "destructive",
        })
        return
      }
      setCarteGriseFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation des champs obligatoires
    if (!formData.immatriculation || !formData.marque || !formData.modele || !formData.annee || !formData.capacite) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    // Validation de la carte grise pour un nouveau véhicule
    if (!isEditMode && (!formData.carteGriseNumero || !formData.carteGriseDateExpiration)) {
      toast({
        title: "Erreur",
        description: "Le numéro et la date d'expiration de la carte grise sont obligatoires",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (isEditMode) {
        // Mode édition
        const response = await fetch(`/api/vehicules/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          onSuccess()
          onOpenChange(false)
        }
      } else {
        // Mode création avec carte grise - utiliser FormData
        const formDataToSend = new FormData()
        
        // Ajouter les données du véhicule
        formDataToSend.append('immatriculation', formData.immatriculation)
        formDataToSend.append('marque', formData.marque)
        formDataToSend.append('modele', formData.modele)
        formDataToSend.append('annee', formData.annee)
        formDataToSend.append('typeCarburant', formData.typeCarburant)
        formDataToSend.append('capacite', formData.capacite)
        formDataToSend.append('kilometrage', formData.kilometrage || '0')
        formDataToSend.append('chauffeurId', formData.chauffeurId || '')
        
        // Ajouter les données de la carte grise
        formDataToSend.append('carteGriseNumero', formData.carteGriseNumero)
        formDataToSend.append('carteGriseDateExpiration', formData.carteGriseDateExpiration)
        
        // Ajouter le fichier si sélectionné
        if (carteGriseFile) {
          formDataToSend.append('carteGriseFile', carteGriseFile)
        }

        const response = await fetch("/api/vehicules", {
          method: "POST",
          body: formDataToSend,
        })

        const result = await response.json()
        
        if (response.ok && result.success) {
          onSuccess()
          onOpenChange(false)
        } else {
          toast({
            title: "Erreur",
            description: result.error || "Erreur lors de la création du véhicule",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement du véhicule",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#0066cc]" />
            {editingId ? "Modifier le véhicule" : "Ajouter un véhicule"}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? "Modifiez les informations du véhicule."
              : "Remplissez les informations du nouveau véhicule."}
          </DialogDescription>
        </DialogHeader>

        {loadingVehicule ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="immatriculation">Immatriculation *</Label>
                <Input
                  id="immatriculation"
                  placeholder="EX: 12345-A-1"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData(prev => ({ ...prev, immatriculation: e.target.value.toUpperCase() }))}
                  className="font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annee">Année *</Label>
                <Input
                  id="annee"
                  type="number"
                  placeholder="2024"
                  value={formData.annee}
                  onChange={(e) => setFormData(prev => ({ ...prev, annee: e.target.value }))}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marque">Marque *</Label>
                <Input
                  id="marque"
                  placeholder="Mercedes, Iveco..."
                  value={formData.marque}
                  onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modele">Modèle *</Label>
                <Input
                  id="modele"
                  placeholder="Sprinter, Daily..."
                  value={formData.modele}
                  onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacite">Capacité (places) *</Label>
                <Input
                  id="capacite"
                  type="number"
                  placeholder="20"
                  value={formData.capacite}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacite: e.target.value }))}
                  min={1}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeCarburant">Type de carburant *</Label>
                <Select
                  value={formData.typeCarburant}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, typeCarburant: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIESEL">Diesel</SelectItem>
                    <SelectItem value="ESSENCE">Essence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kilometrage">Kilométrage</Label>
                <Input
                  id="kilometrage"
                  type="number"
                  placeholder="0"
                  value={formData.kilometrage}
                  onChange={(e) => setFormData(prev => ({ ...prev, kilometrage: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chauffeur">Chauffeur assigné</Label>
                <Select
                  value={formData.chauffeurId || "__none__"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, chauffeurId: value === "__none__" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chauffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun chauffeur</SelectItem>
                    {chauffeurs
                      .filter((c: any) => c.actif)
                      .map((chauffeur: any) => (
                        <SelectItem key={chauffeur.id} value={chauffeur.id}>
                          {chauffeur.nom} {chauffeur.prenom}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Statut Actif/Inactif - Uniquement en mode édition */}
            {isEditMode && (
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="actif" className="text-base font-medium">Véhicule actif</Label>
                  <p className="text-sm text-muted-foreground">
                    Un véhicule inactif n&apos;apparaîtra pas dans les sélections de services
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="actif"
                    className="sr-only peer"
                    checked={formData.actif}
                    onChange={(e) => setFormData(prev => ({ ...prev, actif: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066cc]"></div>
                </label>
              </div>
            )}

            {/* Carte grise - OBLIGATOIRE pour un nouveau véhicule */}
            {!isEditMode && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-lg">Carte grise (Obligatoire)</h3>
                </div>
                <Alert className="mb-4 bg-orange-50 border-orange-200">
                  <AlertDescription className="text-sm">
                    La carte grise est obligatoire pour chaque véhicule. 
                    Veuillez saisir les informations de la carte grise ci-dessous.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="carteGriseNumero">N° Carte grise *</Label>
                    <Input
                      id="carteGriseNumero"
                      placeholder="12345678"
                      value={formData.carteGriseNumero}
                      onChange={(e) => setFormData(prev => ({ ...prev, carteGriseNumero: e.target.value.toUpperCase() }))}
                      className="font-mono uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carteGriseDateExpiration">Date d'expiration *</Label>
                    <Input
                      id="carteGriseDateExpiration"
                      type="date"
                      value={formData.carteGriseDateExpiration}
                      onChange={(e) => setFormData(prev => ({ ...prev, carteGriseDateExpiration: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* File Upload for Carte Grise */}
                <div className="mt-4 space-y-2">
                  <Label>Fichier de la carte grise (optionnel)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {carteGriseFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{carteGriseFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setCarteGriseFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Télécharger la carte grise (PDF, JPG, PNG)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max 5MB
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Parcourir
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || !formData.immatriculation || !formData.marque || !formData.modele}
                className="bg-[#0066cc] hover:bg-[#0052a3]"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Modifier" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
