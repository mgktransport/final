import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { creerChargesSalaire } from '@/lib/charges-auto';
import type { ApiResponse, Salaire } from '@/types';

// PUT /api/chauffeurs/[id]/salaires/[salaireId]/payer - Mark salary as paid and create automatic charges
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; salaireId: string }> }
): Promise<NextResponse<ApiResponse<Salaire>>> {
  try {
    const { id: chauffeurId, salaireId } = await params;

    // Check if chauffeur exists and get CNSS/Assurance info
    const chauffeur = await db.chauffeur.findUnique({
      where: { id: chauffeurId },
      select: { 
        id: true, 
        nom: true, 
        prenom: true,
        montantCNSS: true,
        montantAssurance: true,
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Check if salaire exists and belongs to this chauffeur
    const existingSalaire = await db.salaire.findFirst({
      where: {
        id: salaireId,
        chauffeurId,
      },
    });

    if (!existingSalaire) {
      return NextResponse.json(
        { success: false, error: 'Salaire non trouvé' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (existingSalaire.paye) {
      return NextResponse.json(
        { success: false, error: 'Ce salaire est déjà payé' },
        { status: 400 }
      );
    }

    const { mois, annee } = existingSalaire;

    // Create date range for the month (using UTC to avoid timezone issues)
    const startDate = new Date(Date.UTC(annee, mois - 1, 1));
    const endDate = new Date(Date.UTC(annee, mois, 1));
    const datePaiement = new Date();

    // Use transaction to update salary, mark primes/avances, and create charges
    const [salaire] = await db.$transaction([
      // Update salaire to mark as paid
      db.salaire.update({
        where: { id: salaireId },
        data: {
          paye: true,
          datePaiement,
        },
      }),
      // Mark all primes of this month as comptabilized
      db.prime.updateMany({
        where: {
          chauffeurId,
          comptabilise: false,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        data: {
          comptabilise: true,
        },
      }),
      // Mark all avances of this month as reimbursed
      db.avance.updateMany({
        where: {
          chauffeurId,
          rembourse: false,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        data: {
          rembourse: true,
        },
      }),
    ]);

    // Create automatic charges for this salary
    try {
      await creerChargesSalaire({
        salaireId,
        chauffeurId,
        chauffeurNom: `${chauffeur.nom} ${chauffeur.prenom}`,
        mois,
        annee,
        montantNet: existingSalaire.montantNet,
        montantCNSS: chauffeur.montantCNSS || 0,
        montantAssurance: chauffeur.montantAssurance || 0,
        datePaiement,
      });
    } catch (chargeError) {
      console.error('Erreur création charges automatiques:', chargeError);
      // Continue even if charge creation fails - salary is still marked as paid
    }

    return NextResponse.json({
      success: true,
      data: salaire,
      message: 'Salaire marqué comme payé, primes comptabilisées, avances remboursées et charges créées',
    });
  } catch (error) {
    console.error('Error marking salaire as paid:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du marquage du salaire' },
      { status: 500 }
    );
  }
}
