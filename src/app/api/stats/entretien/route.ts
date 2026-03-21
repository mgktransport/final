import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats/entretien - Statistiques entretien par véhicule
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehiculeId = searchParams.get('vehiculeId')
    const annee = searchParams.get('annee')
    const mois = searchParams.get('mois')

    // Construire les filtres de date
    let dateFilter: any = {}
    if (annee || mois) {
      const year = annee ? parseInt(annee) : new Date().getFullYear()
      
      if (mois) {
        // Filtre par mois spécifique
        const month = parseInt(mois)
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59, 999)
        dateFilter = {
          dateIntervention: {
            gte: startDate,
            lte: endDate,
          }
        }
      } else {
        // Filtre par année
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
        dateFilter = {
          dateIntervention: {
            gte: startDate,
            lte: endDate,
          }
        }
      }
    }

    // Récupérer tous les véhicules avec leurs entretiens
    const whereClause = vehiculeId 
      ? { id: vehiculeId } 
      : { actif: true }

    const vehicules = await db.vehicule.findMany({
      where: whereClause,
      include: {
        entretiens: {
          where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          orderBy: { dateIntervention: 'desc' },
        },
      },
      orderBy: { immatriculation: 'asc' },
    })

    // Types d'entretien pour le regroupement
    const typesEntretien = [
      'VIDANGE',
      'VIDANGE_HUILE',
      'FILTRE_HUILE',
      'FILTRE_AIR',
      'FILTRE_GAZOIL',
      'COURROIE',
      'PNEUS',
      'FREINS',
      'BATTERIE',
      'CLIMATISATION',
      'AUTRE',
    ]

    // Calculer les stats par véhicule
    const statsParVehicule = vehicules.map(vehicule => {
      const entretiens = vehicule.entretiens
      
      // Total coût
      const totalCout = entretiens.reduce((sum, e) => sum + e.cout, 0)
      
      // Nombre d'entretiens
      const nbEntretiens = entretiens.length
      
      // Entretiens par type
      const entretiensParType: Record<string, { count: number; totalCout: number; dernierKm: number | null; prochaineKm: number | null; derniereDate: Date | null }> = {}
      
      entretiens.forEach(e => {
        const type = e.type.toUpperCase()
        if (!entretiensParType[type]) {
          entretiensParType[type] = { count: 0, totalCout: 0, dernierKm: null, prochaineKm: null, derniereDate: null }
        }
        entretiensParType[type].count++
        entretiensParType[type].totalCout += e.cout
        if (e.kilometrage && (!entretiensParType[type].dernierKm || e.kilometrage > entretiensParType[type].dernierKm!)) {
          entretiensParType[type].dernierKm = e.kilometrage
          entretiensParType[type].prochaineKm = e.prochainKm
          entretiensParType[type].derniereDate = e.dateIntervention
        }
      })

      // Dernier entretien
      const dernierEntretien = entretiens.length > 0 ? entretiens[0] : null

      // Coût par km (si on a des entretiens avec kilométrage)
      let coutParKm: number | null = null
      const entretiensAvecKm = entretiens.filter(e => e.kilometrage)
      if (entretiensAvecKm.length >= 2) {
        const kmMin = Math.min(...entretiensAvecKm.map(e => e.kilometrage!))
        const kmMax = Math.max(...entretiensAvecKm.map(e => e.kilometrage!))
        const kmParcourus = kmMax - kmMin
        if (kmParcourus > 0) {
          coutParKm = totalCout / kmParcourus
        }
      }

      // Alertes d'entretien à venir (VIDANGE principalement)
      const alertesEntretien: { type: string; message: string; urgence: 'haute' | 'moyenne' | 'basse' }[] = []
      
      // Vérifier les vidanges
      const vidanges = entretiens.filter(e => e.type.toUpperCase().includes('VIDANGE'))
      if (vidanges.length > 0) {
        const dernierVidange = vidanges[0]
        const prochainKm = dernierVidange.prochainKm
        const prochaineDate = dernierVidange.prochaineDate
        
        if (prochainKm && vehicule.kilometrage) {
          const kmRestants = prochainKm - vehicule.kilometrage
          if (kmRestants <= 0) {
            alertesEntretien.push({
              type: 'VIDANGE',
              message: `Vidange dépassée de ${Math.abs(kmRestants)} km`,
              urgence: 'haute'
            })
          } else if (kmRestants <= 500) {
            alertesEntretien.push({
              type: 'VIDANGE',
              message: `Vidange dans ${kmRestants} km`,
              urgence: 'moyenne'
            })
          } else if (kmRestants <= 1000) {
            alertesEntretien.push({
              type: 'VIDANGE',
              message: `Vidange dans ${kmRestants} km`,
              urgence: 'basse'
            })
          }
        }
        
        if (prochaineDate) {
          const joursRestants = Math.ceil((new Date(prochaineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (joursRestants <= 0) {
            alertesEntretien.push({
              type: 'VIDANGE_DATE',
              message: `Vidange en retard de ${Math.abs(joursRestants)} jour(s)`,
              urgence: 'haute'
            })
          } else if (joursRestants <= 7) {
            alertesEntretien.push({
              type: 'VIDANGE_DATE',
              message: `Vidange dans ${joursRestants} jour(s)`,
              urgence: 'moyenne'
            })
          }
        }
      }

      return {
        id: vehicule.id,
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque,
        modele: vehicule.modele,
        kilometrage: vehicule.kilometrage,
        nbEntretiens,
        totalCout: Math.round(totalCout * 100) / 100,
        coutParKm: coutParKm ? Math.round(coutParKm * 100) / 100 : null,
        dernierEntretien: dernierEntretien ? {
          type: dernierEntretien.type,
          date: dernierEntretien.dateIntervention,
          cout: dernierEntretien.cout,
          kilometrage: dernierEntretien.kilometrage,
        } : null,
        entretiensParType,
        alertesEntretien,
      }
    })

    // Calculer les totaux globaux
    const statsGlobales = {
      nbVehicules: vehicules.length,
      totalEntretiens: statsParVehicule.reduce((sum, v) => sum + v.nbEntretiens, 0),
      totalCout: statsParVehicule.reduce((sum, v) => sum + v.totalCout, 0),
      coutMoyenParVehicule: 0,
      nbAlertes: statsParVehicule.reduce((sum, v) => sum + v.alertesEntretien.length, 0),
      alertesHauteUrgence: statsParVehicule.reduce((sum, v) => 
        sum + v.alertesEntretien.filter(a => a.urgence === 'haute').length, 0),
    }

    if (statsGlobales.nbVehicules > 0) {
      statsGlobales.coutMoyenParVehicule = Math.round((statsGlobales.totalCout / statsGlobales.nbVehicules) * 100) / 100
    }

    // Stats par type d'entretien
    const statsParType: Record<string, { count: number; totalCout: number }> = {}
    vehicules.forEach(v => {
      v.entretiens.forEach(e => {
        const type = e.type.toUpperCase()
        if (!statsParType[type]) {
          statsParType[type] = { count: 0, totalCout: 0 }
        }
        statsParType[type].count++
        statsParType[type].totalCout += e.cout
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        globales: statsGlobales,
        vehicules: statsParVehicule,
        parType: statsParType,
      },
    })
  } catch (error) {
    console.error('Erreur stats entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
}
