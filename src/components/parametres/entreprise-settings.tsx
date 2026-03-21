"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Phone, Mail, Globe, FileText, CreditCard, Loader2, Save } from "lucide-react";

interface Entreprise {
  id: string;
  nom: string;
  logo: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  siret: string | null;
  tvaIntracommunautaire: string | null;
  rib: string | null;
  banque: string | null;
}

async function fetchEntreprise(): Promise<Entreprise | null> {
  const res = await fetch("/api/entreprise");
  if (!res.ok) throw new Error("Erreur lors de la récupération");
  const data = await res.json();
  return data.data;
}

async function updateEntreprise(data: Partial<Entreprise>): Promise<Entreprise> {
  const res = await fetch("/api/entreprise", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour");
  const result = await res.json();
  return result.data;
}

export function EntrepriseSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = React.useState<Partial<Entreprise>>({
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
    siteWeb: "",
    siret: "",
    tvaIntracommunautaire: "",
    rib: "",
    banque: "",
  });

  // Fetch entreprise
  const { data: entreprise, isLoading } = useQuery({
    queryKey: ["entreprise"],
    queryFn: fetchEntreprise,
  });

  // Update form when data loads
  React.useEffect(() => {
    if (entreprise) {
      setFormData({
        nom: entreprise.nom || "",
        adresse: entreprise.adresse || "",
        telephone: entreprise.telephone || "",
        email: entreprise.email || "",
        siteWeb: entreprise.siteWeb || "",
        siret: entreprise.siret || "",
        tvaIntracommunautaire: entreprise.tvaIntracommunautaire || "",
        rib: entreprise.rib || "",
        banque: entreprise.banque || "",
      });
    }
  }, [entreprise]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateEntreprise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entreprise"] });
      toast({ title: "Succès", description: "Informations de l'entreprise mises à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof Entreprise, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations de l&apos;entreprise
          </h3>
          <p className="text-sm text-muted-foreground">
            Ces informations apparaîtront sur les factures et documents officiels
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
            <CardDescription>
              Nom et coordonnées de l&apos;entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de l&apos;entreprise *</Label>
                <Input
                  id="nom"
                  value={formData.nom || ""}
                  onChange={(e) => handleChange("nom", e.target.value)}
                  placeholder="Ex: MGK TRANSPORT"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telephone"
                    value={formData.telephone || ""}
                    onChange={(e) => handleChange("telephone", e.target.value)}
                    placeholder="+212 XXX XXX XXX"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={formData.adresse || ""}
                onChange={(e) => handleChange("adresse", e.target.value)}
                placeholder="Adresse complète de l'entreprise"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="contact@entreprise.ma"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteWeb">Site web</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="siteWeb"
                    value={formData.siteWeb || ""}
                    onChange={(e) => handleChange("siteWeb", e.target.value)}
                    placeholder="www.entreprise.ma"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations fiscales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Informations fiscales et légales
            </CardTitle>
            <CardDescription>
              Numéros d&apos;identification et informations légales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siret">ICE / SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret || ""}
                  onChange={(e) => handleChange("siret", e.target.value)}
                  placeholder="Numéro ICE ou SIRET"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tvaIntracommunautaire">N° TVA Intracommunautaire</Label>
                <Input
                  id="tvaIntracommunautaire"
                  value={formData.tvaIntracommunautaire || ""}
                  onChange={(e) => handleChange("tvaIntracommunautaire", e.target.value)}
                  placeholder="FRXXXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations bancaires */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Informations bancaires
            </CardTitle>
            <CardDescription>
              Coordonnées bancaires (affichées sur les factures)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banque">Banque</Label>
                <Input
                  id="banque"
                  value={formData.banque || ""}
                  onChange={(e) => handleChange("banque", e.target.value)}
                  placeholder="Nom de la banque"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rib">RIB</Label>
                <Input
                  id="rib"
                  value={formData.rib || ""}
                  onChange={(e) => handleChange("rib", e.target.value)}
                  placeholder="RIB bancaire (24 chiffres)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default EntrepriseSettings;
