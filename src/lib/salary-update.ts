/**
 * Helper functions to update pending salaries when primes or avances change
 */

import { db } from '@/lib/db';

/**
 * Update the pending salary for a specific month/year when primes change
 */
export async function updatePendingSalaryForPrimes(
  chauffeurId: string,
  mois: number,
  annee: number
) {
  // Find pending salary for this month/year
  const pendingSalary = await db.salaire.findFirst({
    where: {
      chauffeurId,
      mois,
      annee,
      paye: false, // Only update if not paid yet
    },
  });

  if (!pendingSalary) {
    return null; // No pending salary to update
  }

  // Calculate new primes total from non-comptabilised primes in this month
  const startDate = new Date(annee, mois - 1, 1);
  const endDate = new Date(annee, mois, 1);

  const primes = await db.prime.findMany({
    where: {
      chauffeurId,
      comptabilise: false,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  const montantPrimes = primes.reduce((sum, p) => sum + p.montant, 0);

  // Recalculate net salary
  const montantNet = pendingSalary.montantBase + montantPrimes - pendingSalary.montantAvances;

  // Update salary
  return db.salaire.update({
    where: { id: pendingSalary.id },
    data: {
      montantPrimes,
      montantNet,
    },
  });
}

/**
 * Update the pending salary for a specific month/year when avances change
 */
export async function updatePendingSalaryForAvances(
  chauffeurId: string,
  mois: number,
  annee: number
) {
  // Find pending salary for this month/year
  const pendingSalary = await db.salaire.findFirst({
    where: {
      chauffeurId,
      mois,
      annee,
      paye: false, // Only update if not paid yet
    },
  });

  if (!pendingSalary) {
    return null; // No pending salary to update
  }

  // Calculate new avances total from non-reimbursed avances in this month
  const startDate = new Date(annee, mois - 1, 1);
  const endDate = new Date(annee, mois, 1);

  const avances = await db.avance.findMany({
    where: {
      chauffeurId,
      rembourse: false,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  const montantAvances = avances.reduce((sum, a) => sum + a.montant, 0);

  // Recalculate net salary
  const montantNet = pendingSalary.montantBase + pendingSalary.montantPrimes - montantAvances;

  // Update salary
  return db.salaire.update({
    where: { id: pendingSalary.id },
    data: {
      montantAvances,
      montantNet,
    },
  });
}

/**
 * Extract month and year from a date
 */
export function getMonthYearFromDate(date: Date): { mois: number; annee: number } {
  return {
    mois: date.getMonth() + 1, // getMonth() returns 0-11
    annee: date.getFullYear(),
  };
}
