import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/salaires/recalculate - Recalculate all salaries with correct formula
export async function POST(request: NextRequest) {
  try {
    // Get all salaries
    const salaires = await db.salaire.findMany();

    let updated = 0;
    const updates: { id: string; oldNet: number; newNet: number }[] = [];

    for (const salaire of salaires) {
      // Correct formula: Net = Brut + Primes - Avances
      const correctNet = salaire.montantBase + salaire.montantPrimes - salaire.montantAvances;
      
      if (Math.abs(salaire.montantNet - correctNet) > 0.01) {
        await db.salaire.update({
          where: { id: salaire.id },
          data: { montantNet: correctNet },
        });
        updates.push({
          id: salaire.id,
          oldNet: salaire.montantNet,
          newNet: correctNet,
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updated} salaires recalculés`,
      details: updates,
    });
  } catch (error) {
    console.error('Error recalculating salaries:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du recalcul des salaires' },
      { status: 500 }
    );
  }
}
