"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useCreateService, useUpdateService } from "@/hooks/use-queries";
import { TypeService, type Service, type ServiceFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  service?: Service | null;
  onSuccess?: (service: Service) => void;
}

export function ServiceForm({
  open,
  onOpenChange,
  clientId,
  service,
  onSuccess,
}: ServiceFormProps) {
  const isEditing = !!service;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    defaultValues: {
      clientId,
      typeService: TypeService.TRAJET_JOURNALIER,
      nomService: "",
      description: "",
      lieuDepart: "",
      lieuArrive: "",
      heureDepart: "",
      tarif: 0,
      nombreSalariesMin: 1,
      actif: true,
    },
  });

  // Reset form when dialog opens with service data
  React.useEffect(() => {
    if (open) {
      if (service) {
        reset({
          clientId: service.clientId,
          typeService: service.typeService,
          nomService: service.nomService,
          description: service.description || "",
          lieuDepart: service.lieuDepart || "",
          lieuArrive: service.lieuArrive || "",
          heureDepart: service.heureDepart || "",
          tarif: service.tarif,
          nombreSalariesMin: service.nombreSalariesMin,
          actif: service.actif,
        });
      } else {
        reset({
          clientId,
          typeService: TypeService.TRAJET_JOURNALIER,
          nomService: "",
          description: "",
          lieuDepart: "",
          lieuArrive: "",
          heureDepart: "",
          tarif: 0,
          nombreSalariesMin: 1,
          actif: true,
        });
      }
    }
  }, [open, service, clientId, reset]);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const onSubmit = async (data: ServiceFormData) => {
    try {
      if (isEditing && service) {
        const result = await updateMutation.mutateAsync({
          id: service.id,
          data,
        });
        if (result.success && result.data) {
          toast.success("Service modifié avec succès");
          onSuccess?.(result.data);
        }
      } else {
        const result = await createMutation.mutateAsync(data);
        if (result.success && result.data) {
          toast.success("Service créé avec succès");
          onSuccess?.(result.data);
        }
      }
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error(
        isEditing
          ? "Erreur lors de la modification du service"
          : "Erreur lors de la création du service"
      );
    }
  };

  const actif = watch("actif");
  const typeService = watch("typeService");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le service" : "Ajouter un service"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du service."
              : "Remplissez les informations pour créer un nouveau service."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Service */}
          <div className="space-y-2">
            <Label htmlFor="typeService">
              Type de service <span className="text-destructive">*</span>
            </Label>
            <Select
              value={typeService}
              onValueChange={(value) => setValue("typeService", value as TypeService)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TypeService.TRAJET_JOURNALIER}>
                  Trajet journalier
                </SelectItem>
                <SelectItem value={TypeService.SERVICE_EXCEPTIONNEL}>
                  Service exceptionnel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom Service */}
          <div className="space-y-2">
            <Label htmlFor="nomService">
              Nom du service/trajet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nomService"
              {...register("nomService", {
                required: "Le nom du service est requis",
              })}
              placeholder={typeService === TypeService.TRAJET_JOURNALIER 
                ? "Ex: Navette Matin - Zone Industrielle" 
                : "Ex: Transport événement VIP"}
            />
            {errors.nomService && (
              <p className="text-sm text-destructive">
                {errors.nomService.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Description optionnelle du service..."
              rows={2}
            />
          </div>

          {/* Lieu Depart & Arrive */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lieuDepart">Lieu de départ</Label>
              <Input
                id="lieuDepart"
                {...register("lieuDepart")}
                placeholder="Ex: Siège social"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lieuArrive">Lieu d&apos;arrivée</Label>
              <Input
                id="lieuArrive"
                {...register("lieuArrive")}
                placeholder="Ex: Zone industrielle"
              />
            </div>
          </div>

          {/* Heure Depart */}
          <div className="space-y-2">
            <Label htmlFor="heureDepart">Heure de départ</Label>
            <Input
              id="heureDepart"
              type="time"
              {...register("heureDepart")}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Format: HH:MM (ex: 07:30)
            </p>
          </div>

          {/* Tarif & Nombre Salaries */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tarif">
                Tarif (DH) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tarif"
                type="number"
                step="0.01"
                min="0"
                {...register("tarif", {
                  required: "Le tarif est requis",
                  valueAsNumber: true,
                  min: { value: 0, message: "Le tarif doit être positif" },
                })}
                placeholder="0.00"
              />
              {errors.tarif && (
                <p className="text-sm text-destructive">{errors.tarif.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombreSalariesMin">Min. salariés</Label>
              <Input
                id="nombreSalariesMin"
                type="number"
                min="1"
                {...register("nombreSalariesMin", {
                  valueAsNumber: true,
                  min: { value: 1, message: "Minimum 1 salarié" },
                })}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                Nombre minimal pour effectuer le trajet
              </p>
            </div>
          </div>

          {/* Statut */}
          <div className="flex items-center justify-between">
            <Label htmlFor="actif">Service actif</Label>
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

export default ServiceForm;
