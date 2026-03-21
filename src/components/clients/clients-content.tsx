"use client";

import * as React from "react";
import { useState } from "react";
import { ClientsList } from "@/components/clients/clients-list";
import { ClientForm } from "@/components/clients/client-form";
import { ClientDetails } from "@/components/clients/client-details";
import { type Client } from "@/types";
import { toast } from "sonner";

export function ClientsContent() {
  // State
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Handlers
  const handleAddClient = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClientId(null);
    setDetailsOpen(false);
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleViewClient = (client: Client) => {
    setSelectedClientId(client.id);
    setDetailsOpen(true);
  };

  const handleFormSuccess = (client: Client) => {
    toast.success(editingClient ? "Client modifié avec succès" : "Client ajouté avec succès");
    setFormOpen(false);
    setEditingClient(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingClient(null);
    }
  };

  const handleDetailsClose = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedClientId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestion des Clients
        </h1>
        <p className="text-muted-foreground">
          Gérez vos clients, leurs services, factures et paiements.
        </p>
      </div>

      {/* Clients List */}
      <ClientsList
        onAddClient={handleAddClient}
        onEditClient={handleEditClient}
        onViewClient={handleViewClient}
      />

      {/* Form Dialog */}
      <ClientForm
        open={formOpen}
        onOpenChange={handleFormClose}
        client={editingClient}
        onSuccess={handleFormSuccess}
      />

      {/* Details Sheet */}
      <ClientDetails
        open={detailsOpen}
        onOpenChange={handleDetailsClose}
        clientId={selectedClientId}
        onEdit={handleEditClient}
      />
    </div>
  );
}

export default ClientsContent;
