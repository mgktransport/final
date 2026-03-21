// Facture API Routes - Single facture operations
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StatutFacture } from '@prisma/client';
import type { ApiResponse, Facture } from '@/types';

// GET /api/factures/[id] - Get single facture
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Facture>>> {
  try {
    const { id } = await params;

    const facture = await db.facture.findUnique({
      where: { id },
      include: {
        client: true,
        paiements: {
          orderBy: { date: 'desc' },
        },
        exploitations: {
          include: {
            service: {
              select: {
                id: true,
                nomService: true,
                tarif: true,
                typeService: true,
                lieuDepart: true,
                lieuArrive: true,
              },
            },
            vehicule: {
              select: {
                id: true,
                immatriculation: true,
                marque: true,
                modele: true,
              },
            },
            chauffeur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
              },
            },
          },
          orderBy: { dateHeureDepart: 'desc' },
        },
      },
    });

    if (!facture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: facture,
    });
  } catch (error) {
    console.error('Error fetching facture:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la facture' },
      { status: 500 }
    );
  }
}

// PUT /api/factures/[id] - Update facture
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Facture>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if facture exists
    const existingFacture = await db.facture.findUnique({
      where: { id },
      include: { paiements: true },
    });
    
    if (!existingFacture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }
    
    // Check if facture can be modified
    if (existingFacture.statut === StatutFacture.PAYEE || existingFacture.statut === StatutFacture.ANNULEE) {
      return NextResponse.json(
        { success: false, error: 'Cette facture ne peut plus être modifiée' },
        { status: 400 }
      );
    }
    
    // Calculate TVA and TTC if montantHT or tauxTVA changed
    let montantHT = body.montantHT ?? existingFacture.montantHT;
    let tauxTVA = body.tauxTVA ?? existingFacture.tauxTVA;
    let montantTVA = montantHT * (tauxTVA / 100);
    let montantTTC = montantHT + montantTVA;
    
    // Determine status if dates changed
    let statut = existingFacture.statut;
    if (body.dateEcheance) {
      const dateEcheance = new Date(body.dateEcheance);
      const now = new Date();
      if (dateEcheance < now && statut === StatutFacture.EN_ATTENTE) {
        statut = StatutFacture.EN_RETARD;
      }
    }
    
    // Update facture
    const facture = await db.facture.update({
      where: { id },
      data: {
        clientId: body.clientId,
        dateEmission: body.dateEmission ? new Date(body.dateEmission) : undefined,
        dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : undefined,
        montantHT,
        tauxTVA,
        montantTVA,
        montantTTC,
        statut: body.statut ?? statut,
      },
      include: {
        client: {
          select: {
            id: true,
            nomEntreprise: true,
            telephone: true,
            email: true,
          },
        },
        paiements: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: facture,
      message: 'Facture modifiée avec succès',
    });
  } catch (error) {
    console.error('Error updating facture:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de la facture' },
      { status: 500 }
    );
  }
}

// DELETE /api/factures/[id] - Delete facture
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const { id } = await params;
    
    // Check if facture exists
    const existingFacture = await db.facture.findUnique({
      where: { id },
      include: {
        _count: {
          select: { paiements: true },
        },
      },
    });
    
    if (!existingFacture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }
    
    // Check if facture has payments
    if (existingFacture._count.paiements > 0) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer une facture avec des paiements' },
        { status: 400 }
      );
    }
    
    // Delete facture
    await db.facture.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Facture supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting facture:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la facture' },
      { status: 500 }
    );
  }
}
