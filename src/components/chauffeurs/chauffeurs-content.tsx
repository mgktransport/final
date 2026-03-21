"use client"

import * as React from "react"
import { useState } from "react"
import { ChauffeursList } from "@/components/chauffeurs/chauffeurs-list"
import { ChauffeurForm } from "@/components/chauffeurs/chauffeur-form"
import { ChauffeurDetails } from "@/components/chauffeurs/chauffeur-details"
import { type Chauffeur } from "@/types"
import { toast } from "sonner"

export function ChauffeursContent() {
  // State
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedChauffeurId, setSelectedChauffeurId] = useState<string | null>(null)
  const [editingChauffeur, setEditingChauffeur] = useState<Chauffeur | null>(null)

  // Handlers
  const handleAddChauffeur = () => {
    setEditingChauffeur(null)
    setFormOpen(true)
  }

  const handleEditChauffeur = (chauffeur: Chauffeur) => {
    setSelectedChauffeurId(null)
    setDetailsOpen(false)
    setEditingChauffeur(chauffeur)
    setFormOpen(true)
  }

  const handleViewChauffeur = (chauffeur: Chauffeur) => {
    setSelectedChauffeurId(chauffeur.id)
    setDetailsOpen(true)
  }

  const handleFormSuccess = (chauffeur: Chauffeur) => {
    toast.success(editingChauffeur ? "Chauffeur modifié avec succès" : "Chauffeur ajouté avec succès")
    setFormOpen(false)
    setEditingChauffeur(null)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingChauffeur(null)
    }
  }

  const handleDetailsClose = (open: boolean) => {
    setDetailsOpen(open)
    if (!open) {
      setSelectedChauffeurId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestion des Chauffeurs
        </h1>
        <p className="text-muted-foreground">
          Gérez les chauffeurs, leurs salaires, primes, avances et documents.
        </p>
      </div>

      {/* Chauffeurs List */}
      <ChauffeursList
        onAddChauffeur={handleAddChauffeur}
        onEditChauffeur={handleEditChauffeur}
        onViewChauffeur={handleViewChauffeur}
      />

      {/* Form Dialog */}
      <ChauffeurForm
        open={formOpen}
        onOpenChange={handleFormClose}
        chauffeur={editingChauffeur}
        onSuccess={handleFormSuccess}
      />

      {/* Details Sheet */}
      <ChauffeurDetails
        open={detailsOpen}
        onOpenChange={handleDetailsClose}
        chauffeurId={selectedChauffeurId}
        onEdit={handleEditChauffeur}
      />
    </div>
  )
}
