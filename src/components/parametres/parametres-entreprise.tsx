"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Building2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface CompanyParams {
  nomEntreprise: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  ice: string;
  rc: string;
  cnss: string;
  logo: string;
}

export function ParametresEntreprise() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [params, setParams] = useState<CompanyParams>({
    nomEntreprise: '',
    adresse: '',
    ville: '',
    telephone: '',
    email: '',
    ice: '',
    rc: '',
    cnss: '',
    logo: '',
  });

  // Fetch parameters on mount
  useEffect(() => {
    const fetchParams = async () => {
      try {
        const response = await fetch('/api/parametres');
        const result = await response.json();
        if (result.success && result.data) {
          setParams(prev => ({
            ...prev,
            ...result.data,
          }));
        }
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger les paramètres",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchParams();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Succès",
          description: "Paramètres enregistrés avec succès",
        });
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement des paramètres",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CompanyParams, value: string) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Paramètres de l'entreprise</CardTitle>
        </div>
        <CardDescription>
          Configurez les informations de votre entreprise qui apparaîtront sur les bulletins de paie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations générales */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Informations générales</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nomEntreprise">Nom de l'entreprise</Label>
              <Input
                id="nomEntreprise"
                value={params.nomEntreprise}
                onChange={(e) => handleChange('nomEntreprise', e.target.value)}
                placeholder="MGK TRANSPORT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                value={params.ville}
                onChange={(e) => handleChange('ville', e.target.value)}
                placeholder="Casablanca"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={params.adresse}
              onChange={(e) => handleChange('adresse', e.target.value)}
              placeholder="123 Avenue Mohammed V, Casablanca"
            />
          </div>
        </div>

        <Separator />

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={params.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
                placeholder="+212 522-XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={params.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@mgktransport.ma"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Informations légales */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Informations légales</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ice">ICE (Identifiant Commun de l'Entreprise)</Label>
              <Input
                id="ice"
                value={params.ice}
                onChange={(e) => handleChange('ice', e.target.value)}
                placeholder="001234567000012"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc">RC (Registre de Commerce)</Label>
              <Input
                id="rc"
                value={params.rc}
                onChange={(e) => handleChange('rc', e.target.value)}
                placeholder="123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnss">N° CNSS Employeur</Label>
              <Input
                id="cnss"
                value={params.cnss}
                onChange={(e) => handleChange('cnss', e.target.value)}
                placeholder="1234567"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Logo */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Logo</h3>
          <div className="space-y-2">
            <Label htmlFor="logo">Chemin du logo</Label>
            <Input
              id="logo"
              value={params.logo}
              onChange={(e) => handleChange('logo', e.target.value)}
              placeholder="/upload/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Le logo doit être un fichier PNG ou JPG placé dans le dossier /upload/
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer les paramètres
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ParametresEntreprise;
