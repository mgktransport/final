// API pour générer des factures automatiquement à partir des services non facturés
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StatutFacture, EtatPaiement } from '@prisma/client';
import type { ApiResponse, Facture } from '@/types';

// Generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Get count of invoices this month
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0);
  
  const count = await db.facture.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `FAC-${year}${month}-${sequence}`;
}

// POST /api/factures/generate - Générer une facture à partir des services non facturés
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Facture>>> {
  try {
    const body = await request.json();
    console.log('[API FACTURES GENERATE] Request body:', body);
    
    // Validate required fields
    const { clientId, dateEcheance, tauxTVA, exploitationIds } = body;
    
    console.log('[API FACTURES GENERATE] Extracted values:', { clientId, dateEcheance, tauxTVA, exploitationIds });
    
    if (!clientId || !dateEcheance) {
      console.log('[API FACTURES GENERATE] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Client et date d\'échéance requis' },
        { status: 400 }
      );
    }

    // If exploitationIds provided, use them; otherwise get all non-factured for client
    let exploitations;
    
    if (exploitationIds && Array.isArray(exploitationIds) && exploitationIds.length > 0) {
      // Get specific exploitations
      exploitations = await db.exploitationService.findMany({
        where: {
          id: { in: exploitationIds },
          clientId,
          completed: true,
          factureId: null,
        },
        include: {
          service: {
            select: { tarif: true },
          },
        },
      });
    } else {
      // Get all non-factured exploitations for client
      exploitations = await db.exploitationService.findMany({
        where: {
          clientId,
          completed: true,
          etatPaiement: EtatPaiement.NON_PAYE,
          factureId: null,
        },
        include: {
          service: {
            select: { tarif: true },
          },
        },
      });
    }

    if (exploitations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun service à facturer pour ce client' },
        { status: 400 }
      );
    }

    // Calculate total
    const montantHT = exploitations.reduce((sum, exp) => sum + exp.service.tarif, 0);
    const tva = tauxTVA ?? 0;  // Pas de TVA par défaut
    const montantTVA = montantHT * (tva / 100);
    const montantTTC = montantHT + montantTVA;

    // Generate invoice number
    const numero = await generateInvoiceNumber();
    
    // Create facture and link exploitations in a transaction
    const facture = await db.$transaction(async (tx) => {
      // Create the facture
      const newFacture = await tx.facture.create({
        data: {
          numero,
          clientId,
          dateEmission: new Date(),
          dateEcheance: new Date(dateEcheance),
          montantHT,
          tauxTVA: tva,
          montantTVA,
          montantTTC,
          statut: StatutFacture.EN_ATTENTE,
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
        },
      });

      // Link exploitations to this facture
      await tx.exploitationService.updateMany({
        where: {
          id: { in: exploitations.map(e => e.id) },
        },
        data: {
          factureId: newFacture.id,
        },
      });

      return newFacture;
    });

    return NextResponse.json({
      success: true,
      data: facture,
      message: `Facture ${numero} générée avec ${exploitations.length} service(s)`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating facture:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération de la facture' },
      { status: 500 }
    );
  }
}
