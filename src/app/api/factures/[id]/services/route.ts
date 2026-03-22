// API pour gérer les services (exploitations) d'une facture
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Récupérer les services d'une facture et les services non facturés du client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: factureId } = await params;

    // Récupérer la facture avec ses exploitations
    const facture = await db.facture.findUnique({
      where: { id: factureId },
      include: {
        client: true,
        exploitations: {
          include: {
            service: true,
            vehicule: true,
            chauffeur: true,
          },
        },
      },
    });

    if (!facture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les exploitations non facturées du même client
    const unpaidExploitations = await db.exploitationService.findMany({
      where: {
        clientId: facture.clientId,
        factureId: null,
        etatPaiement: 'NON_PAYE',
      },
      include: {
        service: true,
        vehicule: true,
        chauffeur: true,
      },
      orderBy: { dateHeureDepart: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        facture,
        unpaidExploitations,
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour les services d'une facture
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: factureId } = await params;
    const body = await request.json();
    const { exploitationIdsToAdd, exploitationIdsToRemove, tauxTVA, dateEcheance } = body;

    // Vérifier que la facture existe et n'est pas payée
    const facture = await db.facture.findUnique({
      where: { id: factureId },
      include: { exploitations: true },
    });

    if (!facture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    if (facture.statut === 'PAYEE') {
      return NextResponse.json(
        { success: false, error: 'Impossible de modifier une facture payée' },
        { status: 400 }
      );
    }

    // Transaction pour mettre à jour tout
    const result = await db.$transaction(async (tx) => {
      // Retirer les exploitations de la facture
      if (exploitationIdsToRemove && exploitationIdsToRemove.length > 0) {
        await tx.exploitationService.updateMany({
          where: {
            id: { in: exploitationIdsToRemove },
            factureId: factureId,
          },
          data: {
            factureId: null,
            etatPaiement: 'NON_PAYE',
          },
        });
      }

      // Ajouter les nouvelles exploitations à la facture
      if (exploitationIdsToAdd && exploitationIdsToAdd.length > 0) {
        await tx.exploitationService.updateMany({
          where: {
            id: { in: exploitationIdsToAdd },
            factureId: null,
          },
          data: {
            factureId: factureId,
            etatPaiement: 'PAYE',
          },
        });
      }

      // Récupérer toutes les exploitations de la facture mises à jour
      const updatedExploitations = await tx.exploitationService.findMany({
        where: { factureId: factureId },
        include: { service: true },
      });

      // Calculer le nouveau montant HT
      const montantHT = updatedExploitations.reduce(
        (sum, exp) => sum + (exp.service?.tarif || 0),
        0
      );

      const newTauxTVA = tauxTVA !== undefined ? tauxTVA : facture.tauxTVA;
      const montantTVA = montantHT * (newTauxTVA / 100);
      const montantTTC = montantHT + montantTVA;

      // Préparer les données de mise à jour
      const updateData: Record<string, unknown> = {
        montantHT,
        tauxTVA: newTauxTVA,
        montantTVA,
        montantTTC,
      };

      // Ajouter la date d'échéance si fournie
      if (dateEcheance) {
        updateData.dateEcheance = new Date(dateEcheance);
      }

      // Mettre à jour la facture
      const updatedFacture = await tx.facture.update({
        where: { id: factureId },
        data: updateData,
        include: {
          client: true,
          exploitations: {
            include: {
              service: true,
              vehicule: true,
              chauffeur: true,
            },
          },
        },
      });

      return updatedFacture;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Facture mise à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
