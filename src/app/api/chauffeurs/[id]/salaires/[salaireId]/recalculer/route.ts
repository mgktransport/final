import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Salaire } from '@/types';

// PUT /api/chauffeurs/[id]/salaires/[salaireId]/recalculer - Recalculate salary with current primes/avances
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; salaireId: string }> }
): Promise<NextResponse<ApiResponse<Salaire>>> {
  try {
    const { id: chauffeurId, salaireId } = await params;

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

    // Check if already paid - can't recalculate paid salary
    if (existingSalaire.paye) {
      return NextResponse.json(
        { success: false, error: 'Impossible de recalculer un salaire déjà payé' },
        { status: 400 }
      );
    }

    const { mois, annee } = existingSalaire;

    // Create date range for the month (using UTC to avoid timezone issues)
    const startDate = new Date(Date.UTC(annee, mois - 1, 1));
    const endDate = new Date(Date.UTC(annee, mois, 1));

    console.log('[SALAIRE RECALCULER] Date range:', {
      mois,
      annee,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Get chauffeur with current primes and avances
    const chauffeur = await db.chauffeur.findUnique({
      where: { id: chauffeurId },
      include: {
        primes: {
          where: {
            comptabilise: false,
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
        avances: {
          where: {
            rembourse: false,
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
        tournées: {
          where: {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    console.log('[SALAIRE RECALCULER] Found primes:', chauffeur.primes.map(p => ({
      id: p.id,
      montant: p.montant,
      date: p.date.toISOString(),
    })));

    console.log('[SALAIRE RECALCULER] Found avances:', chauffeur.avances.map(a => ({
      id: a.id,
      montant: a.montant,
      date: a.date.toISOString(),
    })));

    // Recalculate base salary based on salary type
    let montantBase = chauffeur.montantSalaire;

    switch (chauffeur.typeSalaire) {
      case 'FIXE':
        montantBase = chauffeur.montantSalaire;
        break;
      case 'HORAIRE':
        montantBase = chauffeur.montantSalaire * (existingSalaire.heuresTravaillees || 0);
        break;
      case 'PAR_TOURNEE':
        const jours = existingSalaire.joursTravailles ?? chauffeur.tournées.length;
        montantBase = chauffeur.montantSalaire * jours;
        break;
      default:
        montantBase = chauffeur.montantSalaire;
    }

    // Calculate primes total from current DB
    const montantPrimes = chauffeur.primes.reduce((sum, prime) => sum + prime.montant, 0);

    // Calculate avances total from current DB
    const montantAvances = chauffeur.avances.reduce((sum, avance) => sum + avance.montant, 0);

    // Calculate net salary: Base + Primes - Avances
    const montantNet = montantBase + montantPrimes - montantAvances;

    console.log('[SALAIRE RECALCULER] Calculated:', {
      montantBase,
      montantPrimes,
      montantAvances,
      montantNet,
    });

    // Update salary record
    const salaire = await db.salaire.update({
      where: { id: salaireId },
      data: {
        montantBase,
        montantPrimes,
        montantAvances,
        montantNet,
      },
    });

    return NextResponse.json({
      success: true,
      data: salaire,
      message: `Salaire recalculé: Base ${montantBase.toFixed(2)} + Primes ${montantPrimes.toFixed(2)} - Avances ${montantAvances.toFixed(2)} = Net ${montantNet.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error recalculating salaire:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du recalcul du salaire' },
      { status: 500 }
    );
  }
}
