import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse } from '@/types';

interface PreviewData {
  montantPrimes: number;
  montantAvances: number;
  primes: Array<{ id: string; motif: string; montant: number; date: string }>;
  avances: Array<{ id: string; montant: number; date: string }>;
}

// GET /api/chauffeurs/[id]/salaires/preview - Get primes and avances for a specific month
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PreviewData>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const mois = searchParams.get('mois');
    const annee = searchParams.get('annee');
    
    if (!mois || !annee) {
      return NextResponse.json(
        { success: false, error: 'Le mois et l\'année sont obligatoires' },
        { status: 400 }
      );
    }
    
    const moisNum = parseInt(mois, 10);
    const anneeNum = parseInt(annee, 10);

    // Create date range for the month (using UTC to avoid timezone issues)
    const startDate = new Date(Date.UTC(anneeNum, moisNum - 1, 1));
    const endDate = new Date(Date.UTC(anneeNum, moisNum, 1));

    console.log('[SALAIRE PREVIEW] Date range:', {
      mois: moisNum,
      annee: anneeNum,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Check if chauffeur exists
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Get primes for the month (only non-comptabilized)
    const primes = await db.prime.findMany({
      where: {
        chauffeurId: id,
        comptabilise: false,  // Only non-comptabilized primes
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        motif: true,
        montant: true,
        date: true,
      },
    });

    // Get avances for the month (only non-reimbursed)
    const avances = await db.avance.findMany({
      where: {
        chauffeurId: id,
        rembourse: false,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        montant: true,
        date: true,
      },
    });

    console.log('[SALAIRE PREVIEW] Found primes:', primes.map(p => ({
      id: p.id,
      motif: p.motif,
      montant: p.montant,
      date: p.date.toISOString(),
    })));

    console.log('[SALAIRE PREVIEW] Found avances:', avances.map(a => ({
      id: a.id,
      montant: a.montant,
      date: a.date.toISOString(),
    })));

    // Calculate totals
    const montantPrimes = primes.reduce((sum, p) => sum + p.montant, 0);
    const montantAvances = avances.reduce((sum, a) => sum + a.montant, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        montantPrimes,
        montantAvances,
        primes: primes.map(p => ({
          id: p.id,
          motif: p.motif,
          montant: p.montant,
          date: p.date.toISOString(),
        })),
        avances: avances.map(a => ({
          id: a.id,
          montant: a.montant,
          date: a.date.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching salary preview:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
