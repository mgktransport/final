"use client"

import * as React from "react"
import { Truck } from "lucide-react"
import { VehiculesList } from "./vehicules-list"
import { VehiculeForm } from "./vehicule-form"
import { VehiculeDetails } from "./vehicule-details"

export function VehiculesContent() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [viewingId, setViewingId] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const handleAdd = () => {
    setEditingId(null)
    setFormOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setFormOpen(true)
  }

  const handleView = (id: string) => {
    setViewingId(id)
    setDetailsOpen(true)
  }

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#0066cc] flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            Gestion des véhicules
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre flotte de véhicules, entretiens et carburant
          </p>
        </div>
      </div>

      {/* Liste des véhicules */}
      <VehiculesList
        onAdd={handleAdd}
        onEdit={handleEdit}
        onView={handleView}
        refreshKey={refreshKey}
      />

      {/* Formulaire d'ajout/modification */}
      <VehiculeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleSuccess}
        editingId={editingId}
      />

      {/* Détails du véhicule */}
      <VehiculeDetails
        vehiculeId={viewingId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEdit}
        onRefresh={handleSuccess}
      />
    </div>
  )
}
