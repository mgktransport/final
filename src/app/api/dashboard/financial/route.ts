// Dashboard Financial Stats API Route
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Début et fin du mois en cours
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Début et fin du mois précédent
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Début et fin de l'année en cours
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // ===== CHIFFRE D'AFFAIRES =====
    // CA du mois en cours (factures payées)
    const caMoisCourant = await db.facture.aggregate({
      where: {
        statut: 'PAYEE',
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        montantTTC: true,
      },
    });

    // CA du mois précédent
    const caMoisPrecedent = await db.facture.aggregate({
      where: {
        statut: 'PAYEE',
        updatedAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: {
        montantTTC: true,
      },
    });

    // CA de l'année en cours
    const caAnneeCourante = await db.facture.aggregate({
      where: {
        statut: 'PAYEE',
        updatedAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      _sum: {
        montantTTC: true,
      },
    });

    // CA total (toutes les factures payées)
    const caTotal = await db.facture.aggregate({
      where: {
        statut: 'PAYEE',
      },
      _sum: {
        montantTTC: true,
      },
    });

    // ===== CHARGES =====
    // Charges du mois en cours
    const chargesMoisCourant = await db.charge.aggregate({
      where: {
        dateCharge: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        montant: true,
      },
    });

    // Charges du mois précédent
    const chargesMoisPrecedent = await db.charge.aggregate({
      where: {
        dateCharge: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: {
        montant: true,
      },
    });

    // Charges de l'année en cours
    const chargesAnneeCourante = await db.charge.aggregate({
      where: {
        dateCharge: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      _sum: {
        montant: true,
      },
    });

    // Charges totales
    const chargesTotal = await db.charge.aggregate({
      _sum: {
        montant: true,
      },
    });

    // ===== CHARGES PAR CATÉGORIE (mois en cours) =====
    const chargesParCategorie = await db.charge.groupBy({
      by: ['categorie'],
      where: {
        dateCharge: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        montant: true,
      },
    });

    // ===== BÉNÉFICE NET =====
    const caMois = caMoisCourant._sum.montantTTC || 0;
    const chargesMois = chargesMoisCourant._sum.montant || 0;
    const beneficeMois = caMois - chargesMois;

    const caMoisPrec = caMoisPrecedent._sum.montantTTC || 0;
    const chargesMoisPrec = chargesMoisPrecedent._sum.montant || 0;
    const beneficeMoisPrec = caMoisPrec - chargesMoisPrec;

    const caAnnee = caAnneeCourante._sum.montantTTC || 0;
    const chargesAnnee = chargesAnneeCourante._sum.montant || 0;
    const beneficeAnnee = caAnnee - chargesAnnee;

    // Calcul de la tendance (évolution en pourcentage)
    const tendanceCA = caMoisPrec > 0 ? ((caMois - caMoisPrec) / caMoisPrec) * 100 : 0;
    const tendanceCharges = chargesMoisPrec > 0 ? ((chargesMois - chargesMoisPrec) / chargesMoisPrec) * 100 : 0;
    const tendanceBenefice = beneficeMoisPrec !== 0 ? ((beneficeMois - beneficeMoisPrec) / Math.abs(beneficeMoisPrec)) * 100 : 0;

    // ===== FACTURES EN ATTENTE =====
    const facturesEnAttente = await db.facture.aggregate({
      where: {
        statut: 'EN_ATTENTE',
      },
      _sum: {
        montantTTC: true,
      },
      _count: {
        id: true,
      },
    });

    // ===== FACTURES EN RETARD =====
    const facturesEnRetard = await db.facture.aggregate({
      where: {
        statut: 'EN_RETARD',
      },
      _sum: {
        montantTTC: true,
      },
      _count: {
        id: true,
      },
    });

    // ===== CRÉANCES TOTALES (factures non payées) =====
    const creancesTotales = await db.facture.aggregate({
      where: {
        OR: [
          { statut: 'EN_ATTENTE' },
          { statut: 'EN_RETARD' },
        ],
      },
      _sum: {
        montantTTC: true,
      },
    });

    // Paiements reçus sur ces factures
    const paiementsRecus = await db.paiement.aggregate({
      where: {
        facture: {
          OR: [
            { statut: 'EN_ATTENTE' },
            { statut: 'EN_RETARD' },
          ],
        },
      },
      _sum: {
        montant: true,
      },
    });

    const restantAPayer = (creancesTotales._sum.montantTTC || 0) - (paiementsRecus._sum.montant || 0);

    const stats = {
      chiffreAffaires: {
        moisCourant: caMois,
        moisPrecedent: caMoisPrec,
        anneeCourante: caAnnee,
        total: caTotal._sum.montantTTC || 0,
        tendance: tendanceCA,
      },
      charges: {
        moisCourant: chargesMois,
        moisPrecedent: chargesMoisPrec,
        anneeCourante: chargesAnnee,
        total: chargesTotal._sum.montant || 0,
        tendance: tendanceCharges,
        parCategorie: chargesParCategorie.map(c => ({
          categorie: c.categorie,
          montant: c._sum.montant || 0,
        })),
      },
      beneficeNet: {
        moisCourant: beneficeMois,
        moisPrecedent: beneficeMoisPrec,
        anneeCourante: beneficeAnnee,
        tendance: tendanceBenefice,
      },
      creances: {
        enAttente: {
          montant: facturesEnAttente._sum.montantTTC || 0,
          count: facturesEnAttente._count.id,
        },
        enRetard: {
          montant: facturesEnRetard._sum.montantTTC || 0,
          count: facturesEnRetard._count.id,
        },
        restantAPayer,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des statistiques financières' },
      { status: 500 }
    );
  }
}
