// Service pour le recalcul automatique des salaires
import { db } from '@/lib/db';

/**
 * Recalcule automatiquement le salaire d'un chauffeur pour un mois/année donné
 * si un salaire non payé existe pour cette période
 */
export async function recalculateSalaireIfUnpaid(
  chauffeurId: string,
  mois: number,
  annee: number
): Promise<void> {
  try {
    // Vérifier s'il existe un salaire non payé pour ce mois
    const existingSalaire = await db.salaire.findFirst({
      where: {
        chauffeurId,
        mois,
        annee,
        paye: false,
      },
    });

    if (!existingSalaire) {
      console.log('[RECALC SALAIRE] No unpaid salary found, skipping recalculation');
      return;
    }

    // Créer la plage de dates pour le mois
    const startDate = new Date(Date.UTC(annee, mois - 1, 1));
    const endDate = new Date(Date.UTC(annee, mois, 1));

    // Récupérer le chauffeur avec ses primes et avances du mois
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
      console.log('[RECALC SALAIRE] Chauffeur not found');
      return;
    }

    // Recalculer le salaire de base
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
    }

    // Calculer les totaux des primes et avances
    const montantPrimes = chauffeur.primes.reduce((sum, p) => sum + p.montant, 0);
    const montantAvances = chauffeur.avances.reduce((sum, a) => sum + a.montant, 0);
    const montantNet = Math.max(0, montantBase + montantPrimes - montantAvances);

    // Mettre à jour le salaire
    await db.salaire.update({
      where: { id: existingSalaire.id },
      data: {
        montantBase,
        montantPrimes,
        montantAvances,
        montantNet,
      },
    });

    console.log(`[RECALC SALAIRE] Salary ${existingSalaire.id} recalculated:`, {
      montantBase,
      montantPrimes,
      montantAvances,
      montantNet,
    });
  } catch (error) {
    console.error('[RECALC SALAIRE] Error:', error);
  }
}

/**
 * Extrait le mois et l'année d'une date
 */
export function getMonthYearFromDate(date: Date): { mois: number; annee: number } {
  return {
    mois: date.getUTCMonth() + 1,
    annee: date.getUTCFullYear(),
  };
}
