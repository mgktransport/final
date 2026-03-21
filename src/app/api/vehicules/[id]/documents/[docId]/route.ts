import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TypeDocumentVehicule } from '@prisma/client'
import { createAlert, resolveAlertsByReference } from '@/lib/alerts'

// PUT /api/vehicules/[id]/documents/[docId] - Modifier un document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params
    const formData = await request.formData()
    
    // Vérifier que le document existe
    const existingDoc = await db.documentVehicule.findFirst({
      where: { id: docId, vehiculeId: id },
      include: { vehicule: true },
    })
    
    if (!existingDoc) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      )
    }
    
    const type = formData.get('type') as TypeDocumentVehicule | null
    const numero = formData.get('numero') as string | null
    const dateEmission = formData.get('dateEmission') as string | null
    const dateExpiration = formData.get('dateExpiration') as string | null
    const fichier = formData.get('fichier') as File | null
    
    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}
    
    if (type) updateData.type = type
    if (numero !== null) updateData.numero = numero || null
    if (dateEmission !== null) updateData.dateEmission = dateEmission ? new Date(dateEmission) : null
    if (dateExpiration !== null) {
      updateData.dateExpiration = dateExpiration ? new Date(dateExpiration) : null
    }
    
    // Gérer l'upload du fichier
    if (fichier && fichier.size > 0) {
      updateData.fichier = `/uploads/vehicules/${id}/${fichier.name}`
    }
    
    // Mettre à jour le document
    const document = await db.documentVehicule.update({
      where: { id: docId },
      data: updateData,
    })
    
    // Gérer les alertes si la date d'expiration a changé
    if (dateExpiration !== null) {
      // Résoudre les anciennes alertes
      await resolveAlertsByReference(docId)
      
      // Créer une nouvelle alerte si nécessaire
      if (dateExpiration) {
        const expDate = new Date(dateExpiration)
        const now = new Date()
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays <= 30) {
          const priority = diffDays <= 7 ? 'HAUTE' : 'MOYENNE'
          const typeAlerte = document.type === TypeDocumentVehicule.ASSURANCE 
            ? 'ASSURANCE_VEHICULE_EXPIREE'
            : document.type === TypeDocumentVehicule.VISITE_TECHNIQUE
              ? 'VISITE_TECHNIQUE_PROCHE'
              : 'DOCUMENT_EXPIRE'
          
          await createAlert({
            type: typeAlerte,
            titre: `Document ${document.type.toLowerCase()} - ${existingDoc.vehicule.immatriculation}`,
            message: `Le document "${document.type}" du véhicule ${existingDoc.vehicule.immatriculation} ${diffDays < 0 ? 'est expiré' : `expire dans ${diffDays} jours`}`,
            priority,
            referenceId: document.id,
          })
          
          await db.documentVehicule.update({
            where: { id: document.id },
            data: { alerteEnvoyee: true },
          })
        }
      }
    }
    
    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    console.error('Erreur modification document véhicule:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification du document' },
      { status: 500 }
    )
  }
}

// DELETE /api/vehicules/[id]/documents/[docId] - Supprimer un document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params
    
    // Vérifier que le document existe
    const document = await db.documentVehicule.findFirst({
      where: { id: docId, vehiculeId: id },
    })
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      )
    }
    
    // Supprimer les alertes associées
    await resolveAlertsByReference(docId)
    
    // Supprimer le document
    await db.documentVehicule.delete({
      where: { id: docId },
    })
    
    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression document véhicule:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
}
