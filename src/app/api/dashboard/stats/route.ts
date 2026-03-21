// Dashboard Stats API Route
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, DashboardStats } from '@/types';

export async function GET() {
  try {
    // Get counts
    const [
      totalChauffeurs,
      chauffeursActifs,
      totalVehicules,
      vehiculesActifs,
      totalClients,
      clientsActifs,
      facturesEnAttente,
      facturesEnRetard,
      alertesNonLues,
      alertesHautePriorite,
    ] = await Promise.all([
      db.chauffeur.count(),
      db.chauffeur.count({ where: { actif: true } }),
      db.vehicule.count(),
      db.vehicule.count({ where: { actif: true } }),
      db.client.count(),
      db.client.count({ where: { actif: true } }),
      db.facture.count({ where: { statut: 'EN_ATTENTE' } }),
      db.facture.count({ where: { statut: 'EN_RETARD' } }),
      db.alerte.count({ where: { lu: false } }),
      db.alerte.count({ where: { priority: 'HAUTE', resolute: false } }),
    ]);

    // Get documents expiring soon or expired
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [documentsExpires, entretiensAVenir] = await Promise.all([
      db.documentChauffeur.count({
        where: {
          dateExpiration: { lt: now },
        },
      }),
      db.entretien.count({
        where: {
          OR: [
            { prochaineDate: { lte: thirtyDaysFromNow } },
            { prochainKm: { not: null } },
          ],
        },
      }),
    ]);

    const stats: DashboardStats = {
      totalChauffeurs,
      chauffeursActifs,
      totalVehicules,
      vehiculesActifs,
      totalClients,
      clientsActifs,
      facturesEnAttente,
      facturesEnRetard,
      alertesNonLues,
      alertesHautePriorite,
      entretiensAVenir,
      documentsExpires,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    } as ApiResponse<DashboardStats>);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
