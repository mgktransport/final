"use client";

import * as React from "react";
import { useState } from "react";
import { FacturesList } from "@/components/factures/factures-list";
import { FactureForm } from "@/components/factures/facture-form";
import { FactureDetails } from "@/components/factures/facture-details";
import { PaiementForm } from "@/components/factures/paiement-form";
import { type Facture } from "@/types";
import { toast } from "sonner";

export function FacturesContent() {
  // State
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paiementOpen, setPaiementOpen] = useState(false);
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null);
  const [editingFacture, setEditingFacture] = useState<Facture | null>(null);

  // Handlers
  const handleAddFacture = () => {
    setEditingFacture(null);
    setFormOpen(true);
  };

  const handleEditFacture = (facture: Facture) => {
    setSelectedFactureId(null);
    setDetailsOpen(false);
    setEditingFacture(facture);
    setFormOpen(true);
  };

  const handleViewFacture = (facture: Facture) => {
    setSelectedFactureId(facture.id);
    setDetailsOpen(true);
  };

  const handleFormSuccess = (facture: Facture) => {
    toast.success(editingFacture ? "Facture modifiée avec succès" : "Facture créée avec succès");
    setFormOpen(false);
    setEditingFacture(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingFacture(null);
    }
  };

  const handleDetailsClose = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedFactureId(null);
    }
  };

  const handleAddPaiement = (factureId: string) => {
    setSelectedFactureId(factureId);
    setPaiementOpen(true);
  };

  const handlePaiementSuccess = () => {
    toast.success("Paiement enregistré avec succès");
    setPaiementOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Facturation
        </h1>
        <p className="text-muted-foreground">
          Gérez vos factures et suivez les paiements.
        </p>
      </div>

      {/* Factures List */}
      <FacturesList
        onAddFacture={handleAddFacture}
        onEditFacture={handleEditFacture}
        onViewFacture={handleViewFacture}
        onAddPaiement={handleAddPaiement}
      />

      {/* Form Dialog */}
      <FactureForm
        open={formOpen}
        onOpenChange={handleFormClose}
        facture={editingFacture}
        onSuccess={handleFormSuccess}
      />

      {/* Details Sheet */}
      <FactureDetails
        open={detailsOpen}
        onOpenChange={handleDetailsClose}
        factureId={selectedFactureId}
        onEdit={handleEditFacture}
        onAddPaiement={handleAddPaiement}
      />

      {/* Paiement Form */}
      <PaiementForm
        open={paiementOpen}
        onOpenChange={setPaiementOpen}
        factureId={selectedFactureId || ""}
        onSuccess={handlePaiementSuccess}
      />
    </div>
  );
}

export default FacturesContent;
