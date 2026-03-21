"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useCreateClient, useUpdateClient } from "@/hooks/use-queries";
import { TypeContratClient, type Client, type ClientFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: (client: Client) => void;
}

export function ClientForm({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormProps) {
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    defaultValues: {
      nomEntreprise: "",
      contact: "",
      telephone: "",
      email: "",
      adresse: "",
      typeContrat: TypeContratClient.MENSUEL,
      dateFinContrat: "",
      actif: true,
    },
  });

  // Reset form when dialog opens with client data
  React.useEffect(() => {
    if (open) {
      if (client) {
        reset({
          nomEntreprise: client.nomEntreprise,
          contact: client.contact || "",
          telephone: client.telephone,
          email: client.email || "",
          adresse: client.adresse || "",
          typeContrat: client.typeContrat,
          dateFinContrat: client.dateFinContrat 
            ? new Date(client.dateFinContrat).toISOString().split('T')[0] 
            : "",
          actif: client.actif,
        });
      } else {
        reset({
          nomEntreprise: "",
          contact: "",
          telephone: "",
          email: "",
          adresse: "",
          typeContrat: TypeContratClient.MENSUEL,
          dateFinContrat: "",
          actif: true,
        });
      }
    }
  }, [open, client, reset]);

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEditing && client) {
        const result = await updateMutation.mutateAsync({
          id: client.id,
          data,
        });
        if (result.success && result.data) {
          toast.success("Client modifié avec succès");
          onSuccess?.(result.data);
        }
      } else {
        const result = await createMutation.mutateAsync(data);
        if (result.success && result.data) {
          toast.success("Client créé avec succès");
          onSuccess?.(result.data);
        }
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(
        isEditing
          ? "Erreur lors de la modification du client"
          : "Erreur lors de la création du client"
      );
    }
  };

  const actif = watch("actif");
  const typeContrat = watch("typeContrat");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le client" : "Ajouter un client"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du client."
              : "Remplissez les informations pour créer un nouveau client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nom Entreprise */}
          <div className="space-y-2">
            <Label htmlFor="nomEntreprise">
              Nom de l&apos;entreprise <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nomEntreprise"
              {...register("nomEntreprise", {
                required: "Le nom de l'entreprise est requis",
              })}
              placeholder="Ex: ACME Industries"
            />
            {errors.nomEntreprise && (
              <p className="text-sm text-destructive">
                {errors.nomEntreprise.message}
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact">Personne de contact</Label>
            <Input
              id="contact"
              {...register("contact")}
              placeholder="Ex: Jean Dupont"
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="telephone">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="telephone"
              {...register("telephone", {
                required: "Le téléphone est requis",
              })}
              placeholder="Ex: 0612345678"
            />
            {errors.telephone && (
              <p className="text-sm text-destructive">
                {errors.telephone.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email", {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Email invalide",
                },
              })}
              placeholder="Ex: contact@entreprise.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Textarea
              id="adresse"
              {...register("adresse")}
              placeholder="Ex: 123 Rue Example, Casablanca"
              rows={2}
            />
          </div>

          {/* Type Contrat */}
          <div className="space-y-2">
            <Label htmlFor="typeContrat">
              Type de contrat <span className="text-destructive">*</span>
            </Label>
            <Select
              value={typeContrat}
              onValueChange={(value) => setValue("typeContrat", value as TypeContratClient)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TypeContratClient.MENSUEL}>Mensuel</SelectItem>
                <SelectItem value={TypeContratClient.ANNUEL}>Annuel</SelectItem>
                <SelectItem value={TypeContratClient.PONCTUEL}>Ponctuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Fin Contrat */}
          <div className="space-y-2">
            <Label htmlFor="dateFinContrat">Date de fin de contrat</Label>
            <Input
              id="dateFinContrat"
              type="date"
              {...register("dateFinContrat")}
            />
            <p className="text-xs text-muted-foreground">
              Une alerte vous sera envoyée avant l&apos;expiration du contrat
            </p>
          </div>

          {/* Statut */}
          <div className="flex items-center justify-between">
            <Label htmlFor="actif">Client actif</Label>
            <Switch
              id="actif"
              checked={actif}
              onCheckedChange={(checked) => setValue("actif", checked)}
            />
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
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="bg-[#0066cc] hover:bg-[#0066cc]/90"
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? "Enregistrement..."
                : isEditing
                ? "Modifier"
                : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ClientForm;
