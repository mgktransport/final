// Dashboard Charts Data API Route
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();

    // ===== 1. REVENUS VS DÉPENSES (12 derniers mois) =====
    const monthlyData = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(currentYear, now.getMonth() - i, 1);
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();
      
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      // Revenus du mois (factures payées)
      const revenus = await db.facture.aggregate({
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

      // Dépenses du mois
      const depenses = await db.charge.aggregate({
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

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      monthlyData.push({
        month: monthNames[month],
        year,
        revenue: revenus._sum.montantTTC || 0,
        expenses: depenses._sum.montant || 0,
      });
    }

    // ===== 2. TOP CLIENTS (par chiffre d'affaires) =====
    const topClientsData = await db.client.findMany({
      where: {
        actif: true,
      },
      select: {
        id: true,
        nomEntreprise: true,
        actif: true,
        factures: {
          where: {
            statut: 'PAYEE',
          },
          select: {
            montantTTC: true,
          },
        },
      },
    });

    const topClients = topClientsData
      .map(client => ({
        id: client.id,
        name: client.nomEntreprise,
        revenue: client.factures.reduce((sum, f) => sum + (f.montantTTC || 0), 0),
        status: client.actif ? 'actif' : 'inactif',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== 3. RENTABILITÉ PAR VÉHICULE =====
    const vehiclesData = await db.vehicule.findMany({
      where: {
        actif: true,
      },
      select: {
        id: true,
        immatriculation: true,
        marque: true,
        modele: true,
        exploitations: {
          where: {
            facture: {
              statut: 'PAYEE',
            },
          },
          include: {
            service: {
              select: {
                tarif: true,
              },
            },
          },
        },
        charges: {
          where: {
            dateCharge: {
              gte: new Date(currentYear, 0, 1),
              lte: new Date(currentYear, 11, 31, 23, 59, 59),
            },
          },
          select: {
            montant: true,
          },
        },
        pleinsCarburant: {
          where: {
            date: {
              gte: new Date(currentYear, 0, 1),
              lte: new Date(currentYear, 11, 31, 23, 59, 59),
            },
          },
          select: {
            prixTotal: true,
          },
        },
        entretiens: {
          where: {
            dateIntervention: {
              gte: new Date(currentYear, 0, 1),
              lte: new Date(currentYear, 11, 31, 23, 59, 59),
            },
          },
          select: {
            cout: true,
          },
        },
      },
    });

    const vehicleProfitability = vehiclesData
      .map(vehicle => {
        // Revenus: somme des tarifs des services facturés
        const revenue = vehicle.exploitations.reduce((sum, exp) => sum + (exp.service?.tarif || 0), 0);
        
        // Dépenses: charges + carburant + entretiens
        const charges = vehicle.charges.reduce((sum, c) => sum + (c.montant || 0), 0);
        const carburant = vehicle.pleinsCarburant.reduce((sum, p) => sum + (p.prixTotal || 0), 0);
        const entretien = vehicle.entretiens.reduce((sum, e) => sum + (e.cout || 0), 0);
        const costs = charges + carburant + entretien;
        
        const profit = revenue - costs;

        return {
          id: vehicle.id,
          name: vehicle.immatriculation,
          marque: vehicle.marque,
          modele: vehicle.modele,
          revenue,
          costs,
          profit,
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    // ===== 4. RÉPARTITION DES DÉPENSES =====
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const chargesByCategory = await db.charge.groupBy({
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

    // Récupérer les catégories personnalisées pour les labels
    const categoriesPerso = await db.categorieChargePersonnalise.findMany();
    const categoriesMap = new Map(categoriesPerso.map(c => [c.code, c.nom]));

    // Labels par défaut pour les catégories automatiques
    const defaultLabels: Record<string, string> = {
      CARBURANT: 'Carburant',
      ENTRETIEN_VEHICULE: 'Entretien véhicules',
      ACHAT_VEHICULE: 'Achat véhicules',
      ECHEANCE_CREDIT: 'Échéances crédit',
      SALAIRES: 'Salaires',
      CHARGES_SOCIALES: 'Charges sociales',
    };

    const totalCharges = chargesByCategory.reduce((sum, c) => sum + (c._sum.montant || 0), 0);

    // Couleurs pour le graphique
    const colors = ['#0066cc', '#ff6600', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    const expenseDistribution = chargesByCategory
      .map((c, index) => ({
        name: categoriesMap.get(c.categorie) || defaultLabels[c.categorie] || c.categorie,
        value: c._sum.montant || 0,
        percentage: totalCharges > 0 ? Math.round(((c._sum.montant || 0) / totalCharges) * 100) : 0,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);

    // ===== 5. ALERTES RÉCENTES =====
    const recentAlerts = await db.alerte.findMany({
      where: {
        resolute: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const alerts = recentAlerts.map(alert => ({
      id: alert.id,
      title: alert.titre,
      description: alert.message,
      priority: alert.priority.toLowerCase(),
      time: getTimeAgo(alert.createdAt),
      type: alert.type,
    }));

    return NextResponse.json({
      success: true,
      data: {
        revenusVsDepenses: monthlyData,
        topClients,
        rentabiliteVehicules: vehicleProfitability,
        repartitionDepenses: expenseDistribution,
        alertesRecentes: alerts,
      },
    });
  } catch (error) {
    console.error('Error fetching charts data:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des données graphiques' },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return `Il y a ${Math.floor(diffDays / 7)} sem`;
}
