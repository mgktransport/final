// Paiements API Routes for a Facture
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ModePaiement, StatutFacture, EtatPaiement } from '@prisma/client';
import type { ApiResponse, Paiement } from '@/types';

// GET /api/factures/[id]/paiements - Get all payments for a facture
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Paiement[]>>> {
  try {
    const { id: factureId } = await params;
    
    const paiements = await db.paiement.findMany({
      where: { factureId },
      orderBy: { date: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            nomEntreprise: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: paiements,
    });
  } catch (error) {
    console.error('Error fetching paiements:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des paiements' },
      { status: 500 }
    );
  }
}

// POST /api/factures/[id]/paiements - Create a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Paiement>>> {
  try {
    const { id: factureId } = await params;
    const body = await request.json();
    
    // Validate required fields
    const { montant, mode, date } = body;
    
    if (!montant || !mode || !date) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }
    
    // Validate mode
    if (!Object.values(ModePaiement).includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'Mode de paiement invalide' },
        { status: 400 }
      );
    }
    
    // Check if facture exists
    const facture = await db.facture.findUnique({
      where: { id: factureId },
      include: {
        paiements: true,
        client: true,
      },
    });
    
    if (!facture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }
    
    // Check if facture is already paid
    if (facture.statut === StatutFacture.PAYEE) {
      return NextResponse.json(
        { success: false, error: 'Cette facture est déjà payée' },
        { status: 400 }
      );
    }
    
    // Check if facture is cancelled
    if (facture.statut === StatutFacture.ANNULEE) {
      return NextResponse.json(
        { success: false, error: 'Cette facture est annulée' },
        { status: 400 }
      );
    }
    
    // Calculate total paid so far
    const totalPaid = facture.paiements.reduce((sum, p) => sum + p.montant, 0);
    const remainingAmount = facture.montantTTC - totalPaid;
    
    // Check if payment amount is valid
    if (montant > remainingAmount) {
      return NextResponse.json(
        { success: false, error: `Le montant du paiement ne peut pas dépasser le reste à payer: ${remainingAmount.toFixed(2)} DH` },
        { status: 400 }
      );
    }
    
    // Create payment and update facture status
    const result = await db.$transaction(async (tx) => {
      // Create payment
      const paiement = await tx.paiement.create({
        data: {
          factureId,
          clientId: facture.clientId,
          montant,
          mode,
          reference: body.reference || null,
          date: new Date(date),
        },
        include: {
          client: {
            select: {
              id: true,
              nomEntreprise: true,
            },
          },
        },
      });
      
      // Calculate new total paid
      const newTotalPaid = totalPaid + montant;
      
      // Update facture status if fully paid
      if (newTotalPaid >= facture.montantTTC) {
        await tx.facture.update({
          where: { id: factureId },
          data: { statut: StatutFacture.PAYEE },
        });
        
        // Update etatPaiement of all linked exploitations to PAYE
        await tx.exploitationService.updateMany({
          where: { factureId },
          data: { etatPaiement: EtatPaiement.PAYE },
        });
      }
      
      return paiement;
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Paiement enregistré avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating paiement:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du paiement' },
      { status: 500 }
    );
  }
}
