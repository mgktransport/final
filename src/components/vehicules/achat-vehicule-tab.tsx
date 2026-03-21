"use client"

import * as React from "react"
import {
  CreditCard,
  Banknote,
  Plus,
  Calendar,
  Building2,
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/format"

// Types
type TypeAchat = 'COMPTANT' | 'CREDIT'
type FrequencePaiement = 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'ANNUEL'
type StatutAchat = 'EN_COURS' | 'SOLDE' | 'ANNULE'
type StatutEcheance = 'EN_ATTENTE' | 'PAYEE' | 'PARTIELLEMENT' | 'EN_RETARD'
type ModePaiementAchat = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CARTE' | 'PRELEVEMENT'

interface EcheanceCredit {
  id: string
  numeroEcheance: number
  dateEcheance: string | Date
  montantEcheance: number
  montantPaye: number
  datePaiement: string | Date | null
  statut: StatutEcheance
  observations: string | null
}

interface PaiementAchat {
  id: string
  datePaiement: string | Date
  montant: number
  modePaiement: ModePaiementAchat
  reference: string | null
  observations: string | null
}

interface AchatVehicule {
  id: string
  typeAchat: TypeAchat
  dateAchat: string | Date
  montantTotal: number
  acompte: number
  fournisseur: string | null
  adresseFournisseur: string | null
  telephoneFournisseur: string | null
  numeroFacture: string | null
  observations: string | null
  nombreEcheances: number | null
  montantEcheance: number | null
  datePremiereEcheance: string | Date | null
  frequencePaiement: FrequencePaiement | null
  statut: StatutAchat
  montantPaye: number
  montantRestant: number
  dateDernierPaiement: string | Date | null
  echeances: EcheanceCredit[]
  paiementsAchat: PaiementAchat[]
  stats?: {
    echeancesPayees: number
    echeancesEnRetard: number
    totalEcheances: number
    pourcentagePaye: number
  }
}

interface AchatVehiculeTabProps {
  vehiculeId: string
  onRefresh?: () => void
}

// Labels
const TYPE_ACHAT_LABELS: Record<TypeAchat, string> = {
  COMPTANT: 'Comptant',
  CREDIT: 'Crédit classique'
}

const FREQUENCE_LABELS: Record<FrequencePaiement, string> = {
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  ANNUEL: 'Annuel'
}

const STATUT_ACHAT_LABELS: Record<StatutAchat, string> = {
  EN_COURS: 'En cours',
  SOLDE: 'Soldé',
  ANNULE: 'Annulé'
}

const STATUT_ECHEANCE_LABELS: Record<StatutEcheance, string> = {
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  PARTIELLEMENT: 'Partiellement payée',
  EN_RETARD: 'En retard'
}

const MODE_PAIEMENT_LABELS: Record<ModePaiementAchat, string> = {
  ESPECES: 'Espèces',
  CHEQUE: 'Chèque',
  VIREMENT: 'Virement',
  CARTE: 'Carte bancaire',
  PRELEVEMENT: 'Prélèvement'
}

export function AchatVehiculeTab({ vehiculeId, onRefresh }: AchatVehiculeTabProps) {
  const { toast } = useToast()
  const [achat, setAchat] = React.useState<AchatVehicule | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [formOpen, setFormOpen] = React.useState(false)
  const [paiementFormOpen, setPaiementFormOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedEcheanceId, setSelectedEcheanceId] = React.useState<string | null>(null)
  
  // Form states
  const [typeAchat, setTypeAchat] = React.useState<TypeAchat>('COMPTANT')
  const [dateAchat, setDateAchat] = React.useState('')
  const [montantTotal, setMontantTotal] = React.useState('')
  const [acompte, setAcompte] = React.useState('0')
  const [fournisseur, setFournisseur] = React.useState('')
  const [adresseFournisseur, setAdresseFournisseur] = React.useState('')
  const [telephoneFournisseur, setTelephoneFournisseur] = React.useState('')
  const [numeroFacture, setNumeroFacture] = React.useState('')
  const [observations, setObservations] = React.useState('')
  const [nombreEcheances, setNombreEcheances] = React.useState('')
  const [montantEcheance, setMontantEcheance] = React.useState('')
  const [datePremiereEcheance, setDatePremiereEcheance] = React.useState('')
  const [frequencePaiement, setFrequencePaiement] = React.useState<FrequencePaiement>('MENSUEL')
  
  // Paiement form states
  const [paiementDate, setPaiementDate] = React.useState('')
  const [paiementMontant, setPaiementMontant] = React.useState('')
  const [paiementMode, setPaiementMode] = React.useState<ModePaiementAchat>('ESPECES')
  const [paiementReference, setPaiementReference] = React.useState('')
  const [paiementObservations, setPaiementObservations] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Fetch achat data
  const fetchAchat = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/vehicules/${vehiculeId}/achat`)
      const data = await response.json()
      if (data.success) {
        setAchat(data.data)
      }
    } catch (error) {
      console.error('Error fetching achat:', error)
    } finally {
      setIsLoading(false)
    }
  }, [vehiculeId])

  React.useEffect(() => {
    fetchAchat()
  }, [fetchAchat])

  // Reset form
  const resetForm = () => {
    setTypeAchat('COMPTANT')
    setDateAchat(new Date().toISOString().split('T')[0])
    setMontantTotal('')
    setAcompte('0')
    setFournisseur('')
    setAdresseFournisseur('')
    setTelephoneFournisseur('')
    setNumeroFacture('')
    setObservations('')
    setNombreEcheances('')
    setMontantEcheance('')
    setDatePremiereEcheance('')
    setFrequencePaiement('MENSUEL')
  }

  // Reset paiement form
  const resetPaiementForm = () => {
    setPaiementDate(new Date().toISOString().split('T')[0])
    setPaiementMontant('')
    setPaiementMode('ESPECES')
    setPaiementReference('')
    setPaiementObservations('')
    setSelectedEcheanceId(null)
  }

  // Submit achat form
  const handleSubmit = async () => {
    if (!dateAchat || !montantTotal) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir les champs obligatoires'
      })
      return
    }

    if (typeAchat === 'CREDIT' && (!nombreEcheances || !montantEcheance || !datePremiereEcheance)) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir les informations de crédit'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/vehicules/${vehiculeId}/achat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeAchat,
          dateAchat,
          montantTotal: parseFloat(montantTotal),
          acompte: parseFloat(acompte) || 0,
          fournisseur: fournisseur || null,
          adresseFournisseur: adresseFournisseur || null,
          telephoneFournisseur: telephoneFournisseur || null,
          numeroFacture: numeroFacture || null,
          observations: observations || null,
          nombreEcheances: typeAchat === 'CREDIT' ? parseInt(nombreEcheances) : null,
          montantEcheance: typeAchat === 'CREDIT' ? parseFloat(montantEcheance) : null,
          datePremiereEcheance: typeAchat === 'CREDIT' ? datePremiereEcheance : null,
          frequencePaiement: typeAchat === 'CREDIT' ? frequencePaiement : null
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Achat enregistré avec succès'
        })
        setFormOpen(false)
        resetForm()
        fetchAchat()
        onRefresh?.()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'enregistrement'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit paiement
  const handlePaiementSubmit = async () => {
    if (!paiementDate || !paiementMontant) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir les champs obligatoires'
      })
      return
    }

    if (!achat) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/achats-vehicules/${achat.id}/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datePaiement: paiementDate,
          montant: parseFloat(paiementMontant),
          modePaiement: paiementMode,
          reference: paiementReference || null,
          observations: paiementObservations || null,
          echeanceId: selectedEcheanceId
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Paiement enregistré avec succès'
        })
        setPaiementFormOpen(false)
        resetPaiementForm()
        fetchAchat()
        onRefresh?.()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'enregistrement'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete achat
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/vehicules/${vehiculeId}/achat`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Achat supprimé avec succès'
        })
        setDeleteDialogOpen(false)
        setAchat(null)
        onRefresh?.()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression'
      })
    }
  }

  // Get status badge color
  const getStatutBadgeClass = (statut: StatutAchat | StatutEcheance) => {
    switch (statut) {
      case 'SOLDE':
      case 'PAYEE':
        return 'bg-green-500 text-white'
      case 'EN_COURS':
      case 'EN_ATTENTE':
        return 'bg-blue-500 text-white'
      case 'EN_RETARD':
        return 'bg-red-500 text-white'
      case 'PARTIELLEMENT':
        return 'bg-orange-500 text-white'
      case 'ANNULE':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No achat registered
  if (!achat) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Achat du véhicule</h3>
          <Button
            size="sm"
            className="bg-[#0066cc] hover:bg-[#0052a3]"
            onClick={() => {
              resetForm()
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Enregistrer l'achat
          </Button>
        </div>

        <div className="text-center py-8 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune information d'achat enregistrée</p>
          <p className="text-sm mt-1">Cliquez sur "Enregistrer l'achat" pour ajouter les informations</p>
        </div>

        {/* Achat Form Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enregistrer l'achat du véhicule</DialogTitle>
              <DialogDescription>
                Renseignez les informations concernant l'achat de ce véhicule
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Type d'achat */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Type d'achat *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={typeAchat === 'COMPTANT' ? 'default' : 'outline'}
                    className={typeAchat === 'COMPTANT' ? 'bg-[#0066cc] hover:bg-[#0052a3]' : ''}
                    onClick={() => setTypeAchat('COMPTANT')}
                  >
                    <Banknote className="h-4 w-4 mr-2" />
                    Comptant
                  </Button>
                  <Button
                    type="button"
                    variant={typeAchat === 'CREDIT' ? 'default' : 'outline'}
                    className={typeAchat === 'CREDIT' ? 'bg-[#0066cc] hover:bg-[#0052a3]' : ''}
                    onClick={() => setTypeAchat('CREDIT')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Crédit classique
                  </Button>
                </div>
              </div>

              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date d'achat *</Label>
                  <Input
                    type="date"
                    value={dateAchat}
                    onChange={(e) => setDateAchat(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Montant total (DH) *</Label>
                  <Input
                    type="number"
                    value={montantTotal}
                    onChange={(e) => setMontantTotal(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Acompte (pour crédit) */}
              {typeAchat === 'CREDIT' && (
                <div>
                  <Label>Acompte versé (DH)</Label>
                  <Input
                    type="number"
                    value={acompte}
                    onChange={(e) => setAcompte(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Informations crédit */}
              {typeAchat === 'CREDIT' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Informations de crédit</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre d'échéances *</Label>
                      <Input
                        type="number"
                        value={nombreEcheances}
                        onChange={(e) => setNombreEcheances(e.target.value)}
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <Label>Montant par échéance (DH) *</Label>
                      <Input
                        type="number"
                        value={montantEcheance}
                        onChange={(e) => setMontantEcheance(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Date première échéance *</Label>
                      <Input
                        type="date"
                        value={datePremiereEcheance}
                        onChange={(e) => setDatePremiereEcheance(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Fréquence de paiement</Label>
                      <Select value={frequencePaiement} onValueChange={(v) => setFrequencePaiement(v as FrequencePaiement)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FREQUENCE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Fournisseur */}
              <div className="space-y-4">
                <h4 className="font-medium">Fournisseur (optionnel)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom / Garage</Label>
                    <Input
                      value={fournisseur}
                      onChange={(e) => setFournisseur(e.target.value)}
                      placeholder="Nom du fournisseur"
                    />
                  </div>
                  <div>
                    <Label>N° Facture</Label>
                    <Input
                      value={numeroFacture}
                      onChange={(e) => setNumeroFacture(e.target.value)}
                      placeholder="Numéro de facture"
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={telephoneFournisseur}
                      onChange={(e) => setTelephoneFournisseur(e.target.value)}
                      placeholder="Téléphone"
                    />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input
                      value={adresseFournisseur}
                      onChange={(e) => setAdresseFournisseur(e.target.value)}
                      placeholder="Adresse"
                    />
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div>
                <Label>Observations</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notes diverses..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-[#0066cc] hover:bg-[#0052a3]"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Achat exists
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Achat du véhicule</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {achat.typeAchat === 'COMPTANT' ? (
                <Banknote className="h-5 w-5 text-green-600" />
              ) : (
                <CreditCard className="h-5 w-5 text-blue-600" />
              )}
              <CardTitle className="text-lg">
                {TYPE_ACHAT_LABELS[achat.typeAchat]}
              </CardTitle>
            </div>
            <Badge className={getStatutBadgeClass(achat.statut)}>
              {STATUT_ACHAT_LABELS[achat.statut]}
            </Badge>
          </div>
          <CardDescription>
            Achat effectué le {formatDate(achat.dateAchat)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Montant total</p>
              <p className="text-xl font-bold text-[#ff6600]">
                {formatCurrency(achat.montantTotal)}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">Payé</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(achat.montantPaye)}
              </p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">Restant</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(achat.montantRestant)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {achat.typeAchat === 'CREDIT' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression du paiement</span>
                <span>{achat.stats?.pourcentagePaye.toFixed(1) || 0}%</span>
              </div>
              <Progress value={achat.stats?.pourcentagePaye || 0} className="h-2" />
            </div>
          )}

          {/* Supplier info */}
          {achat.fournisseur && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Fournisseur
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom:</span> {achat.fournisseur}
                </div>
                {achat.numeroFacture && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span className="text-muted-foreground">Facture:</span> {achat.numeroFacture}
                  </div>
                )}
                {achat.telephoneFournisseur && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span className="text-muted-foreground">Tél:</span> {achat.telephoneFournisseur}
                  </div>
                )}
                {achat.adresseFournisseur && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Adresse:</span> {achat.adresseFournisseur}
                  </div>
                )}
              </div>
            </div>
          )}

          {achat.observations && (
            <div className="text-sm text-muted-foreground italic">
              {achat.observations}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit specific info */}
      {achat.typeAchat === 'CREDIT' && achat.nombreEcheances && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Échéances
              </CardTitle>
              <Button
                size="sm"
                className="bg-[#0066cc] hover:bg-[#0052a3]"
                onClick={() => {
                  resetPaiementForm()
                  setPaiementFormOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un paiement
              </Button>
            </div>
            <CardDescription>
              {achat.stats?.echeancesPayees || 0} / {achat.stats?.totalEcheances || 0} échéances payées
              {achat.stats?.echeancesEnRetard ? (
                <span className="text-red-500 ml-2">
                  ({achat.stats.echeancesEnRetard} en retard)
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {achat.echeances.map((echeance) => (
                <div
                  key={echeance.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    echeance.statut === 'PAYEE'
                      ? 'bg-green-50 dark:bg-green-950/30'
                      : echeance.statut === 'EN_RETARD'
                      ? 'bg-red-50 dark:bg-red-950/30'
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {echeance.statut === 'PAYEE' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : echeance.statut === 'EN_RETARD' ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        Échéance {echeance.numeroEcheance}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(echeance.dateEcheance)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(echeance.montantEcheance)}</p>
                      {echeance.statut === 'PAYEE' && echeance.datePaiement && (
                        <p className="text-xs text-green-600">
                          Payé le {formatDate(echeance.datePaiement)}
                        </p>
                      )}
                    </div>
                    {echeance.statut !== 'PAYEE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          resetPaiementForm()
                          setPaiementMontant(echeance.montantEcheance.toString())
                          setSelectedEcheanceId(echeance.id)
                          setPaiementFormOpen(true)
                        }}
                      >
                        Payer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      {achat.paiementsAchat.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {achat.paiementsAchat.map((paiement) => (
                <div
                  key={paiement.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{formatCurrency(paiement.montant)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(paiement.datePaiement)} - {MODE_PAIEMENT_LABELS[paiement.modePaiement]}
                      {paiement.reference && ` (${paiement.reference})`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={paiementFormOpen} onOpenChange={setPaiementFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              {selectedEcheanceId
                ? 'Enregistrez le paiement pour cette échéance'
                : 'Enregistrez un nouveau paiement'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date du paiement *</Label>
                <Input
                  type="date"
                  value={paiementDate}
                  onChange={(e) => setPaiementDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Montant (DH) *</Label>
                <Input
                  type="number"
                  value={paiementMontant}
                  onChange={(e) => setPaiementMontant(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Mode de paiement</Label>
              <Select value={paiementMode} onValueChange={(v) => setPaiementMode(v as ModePaiementAchat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_PAIEMENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paiementMode === 'CHEQUE' && (
              <div>
                <Label>N° Chèque</Label>
                <Input
                  value={paiementReference}
                  onChange={(e) => setPaiementReference(e.target.value)}
                  placeholder="Numéro du chèque"
                />
              </div>
            )}

            {(paiementMode === 'VIREMENT' || paiementMode === 'PRELEVEMENT') && (
              <div>
                <Label>Référence</Label>
                <Input
                  value={paiementReference}
                  onChange={(e) => setPaiementReference(e.target.value)}
                  placeholder="Référence du virement/prélèvement"
                />
              </div>
            )}

            <div>
              <Label>Observations</Label>
              <Textarea
                value={paiementObservations}
                onChange={(e) => setPaiementObservations(e.target.value)}
                placeholder="Notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaiementFormOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[#0066cc] hover:bg-[#0052a3]"
              onClick={handlePaiementSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'achat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet achat ? Cette action supprimera également
              toutes les échéances et l'historique des paiements associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
