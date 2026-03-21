import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats/carburant - Statistiques carburant par véhicule
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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
          date: {
            gte: startDate,
            lte: endDate,
          }
        }
      } else {
        // Filtre par année
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
        dateFilter = {
          date: {
            gte: startDate,
            lte: endDate,
          }
        }
      }
    }

    // Récupérer tous les véhicules avec leurs pleins
    const vehicules = await db.vehicule.findMany({
      where: { actif: true },
      include: {
        pleinsCarburant: {
          where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { immatriculation: 'asc' },
    })

    // Calculer les stats par véhicule
    const statsParVehicule = vehicules.map(vehicule => {
      const pleins = vehicule.pleinsCarburant
      
      // Total litres et coût
      const totalLitres = pleins.reduce((sum, p) => sum + p.quantite, 0)
      const totalCout = pleins.reduce((sum, p) => sum + p.prixTotal, 0)
      
      // Calcul consommation moyenne (L/100km)
      let consommationMoyenne = 0
      let kmParcourus = 0
      let coutParKm = 0
      
      if (pleins.length >= 2) {
        // Prendre le premier et dernier km
        const sortedPleins = [...pleins].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        
        const premierPlein = sortedPleins[0]
        const dernierPlein = sortedPleins[sortedPleins.length - 1]
        
        kmParcourus = dernierPlein.kilometrage - premierPlein.kilometrage
        
        if (kmParcourus > 0) {
          // Litres consommés = tous les pleins sauf le premier
          const litresConsommes = sortedPleins.slice(1).reduce((sum, p) => sum + p.quantite, 0)
          consommationMoyenne = (litresConsommes / kmParcourus) * 100
          coutParKm = totalCout / kmParcourus
        }
      }
      
      return {
        id: vehicule.id,
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque,
        modele: vehicule.modele,
        kilometrage: vehicule.kilometrage,
        nbPleins: pleins.length,
        totalLitres: Math.round(totalLitres * 100) / 100,
        totalCout: Math.round(totalCout * 100) / 100,
        consommationMoyenne: consommationMoyenne > 0 ? Math.round(consommationMoyenne * 10) / 10 : null,
        coutParKm: coutParKm > 0 ? Math.round(coutParKm * 100) / 100 : null,
        kmParcourus,
      }
    })

    // Calculer les totaux globaux
    const statsGlobales = {
      nbVehicules: vehicules.length,
      totalLitres: statsParVehicule.reduce((sum, v) => sum + v.totalLitres, 0),
      totalCout: statsParVehicule.reduce((sum, v) => sum + v.totalCout, 0),
      moyennePrixL: 0,
      consommationMoyenne: 0,
      coutParKm: 0,
      totalKmParcourus: 0,
    }
    
    // Prix moyen au litre et stats globales
    const tousPleins = vehicules.flatMap(v => v.pleinsCarburant)
    if (tousPleins.length > 0) {
      const totalPrix = tousPleins.reduce((sum, p) => sum + p.prixTotal, 0)
      const totalLitres = tousPleins.reduce((sum, p) => sum + p.quantite, 0)
      statsGlobales.moyennePrixL = Math.round((totalPrix / totalLitres) * 100) / 100
      
      // Calcul consommation moyenne globale
      // Pour chaque véhicule avec au moins 2 pleins, calculer les km et litres consommés
      let totalKmGlobal = 0
      let totalLitresConsommes = 0
      
      vehicules.forEach(vehicule => {
        const pleins = vehicule.pleinsCarburant
        if (pleins.length >= 2) {
          const sortedPleins = [...pleins].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          const kmVehicule = sortedPleins[sortedPleins.length - 1].kilometrage - sortedPleins[0].kilometrage
          const litresVehicule = sortedPleins.slice(1).reduce((sum, p) => sum + p.quantite, 0)
          
          if (kmVehicule > 0) {
            totalKmGlobal += kmVehicule
            totalLitresConsommes += litresVehicule
          }
        }
      })
      
      statsGlobales.totalKmParcourus = totalKmGlobal
      
      if (totalKmGlobal > 0) {
        statsGlobales.consommationMoyenne = Math.round((totalLitresConsommes / totalKmGlobal) * 1000) / 10 // L/100km
        statsGlobales.coutParKm = Math.round((totalPrix / totalKmGlobal) * 100) / 100 // DH/km
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        globales: statsGlobales,
        vehicules: statsParVehicule,
      },
    })
  } catch (error) {
    console.error('Erreur stats carburant:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
}
