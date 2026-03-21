"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useCreatePaiement, useFacture } from "@/hooks/use-queries";
import { ModePaiement, type PaiementFormData } from "@/types";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Wallet, Receipt, Loader2 } from "lucide-react";

interface PaiementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factureId: string;
  onSuccess?: () => void;
}

export function PaiementForm({
  open,
  onOpenChange,
  factureId,
  onSuccess,
}: PaiementFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaiementFormData>({
    defaultValues: {
      factureId: "",
      montant: 0,
      mode: ModePaiement.ESPECES,
      reference: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const { data: facture, isLoading: loadingFacture } = useFacture(factureId);
  const createMutation = useCreatePaiement();

  // Montant TTC de la facture
  const montantTTC = facture?.montantTTC || 0;

  // Reset form when dialog opens with facture data loaded
  React.useEffect(() => {
    if (open && factureId && facture) {
      reset({
        factureId,
        montant: montantTTC, // Montant automatique = TTC
        mode: ModePaiement.ESPECES,
        reference: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [open, factureId, facture, montantTTC, reset]);

  const onSubmit = async (data: PaiementFormData) => {
    try {
      const result = await createMutation.mutateAsync({
        factureId,
        data: {
          montant: data.montant,
          mode: data.mode,
          reference: data.reference,
          date: data.date,
        },
      });
      if (result.success) {
        toast.success("Paiement enregistré avec succès");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error creating paiement:", error);
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  const mode = watch("mode") || ModePaiement.ESPECES;

  // Don't render form content if facture is loading
  if (!facture && loadingFacture) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#0066cc]" />
              Chargement...
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Enregistrer le paiement
          </DialogTitle>
          <DialogDescription>
            Facture: {facture?.numero} - {facture?.client?.nomEntreprise}
          </DialogDescription>
        </DialogHeader>

        {/* Montant à payer */}
        <div className="rounded-lg border p-4 bg-green-50 border-green-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-green-800">Montant à payer:</span>
            <span className="text-xl font-bold text-green-700">{formatCurrency(montantTTC)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Mode de paiement */}
          <div className="space-y-2">
            <Label htmlFor="mode">
              Mode de paiement <span className="text-destructive">*</span>
            </Label>
            <Select
              value={mode}
              onValueChange={(value) => setValue("mode", value as ModePaiement)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ModePaiement.ESPECES}>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Espèces
                  </div>
                </SelectItem>
                <SelectItem value={ModePaiement.VIREMENT}>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Virement bancaire
                  </div>
                </SelectItem>
                <SelectItem value={ModePaiement.CHEQUE}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Chèque
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Référence (for virement/cheque) */}
          {(mode === ModePaiement.VIREMENT || mode === ModePaiement.CHEQUE) && (
            <div className="space-y-2">
              <Label htmlFor="reference">
                Référence {mode === ModePaiement.CHEQUE && "(N° Chèque)"}
              </Label>
              <Input
                id="reference"
                {...register("reference")}
                placeholder="Ex: CHQ-123456"
              />
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Date du paiement <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              {...register("date", {
                required: "La date est requise",
              })}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PaiementForm;
