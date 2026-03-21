import { NextRequest, NextResponse } from 'next/server';
import { checkAllAlerts } from '@/lib/alerts';
import type { ApiResponse } from '@/types';

// POST /api/alertes/check-documents - Check all alerts (documents, factures, entretiens, contrats CDD, documents véhicules, contrats clients)
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ 
  documents: number; 
  documentsVehicules: number;
  factures: number; 
  entretiens: number; 
  contratsCDD: number;
  contratsClients: number;
  chauffeursDesactivates: number;
  total: number;
}>>> {
  try {
    const results = await checkAllAlerts();

    const parts = [];
    if (results.documents > 0) parts.push(`${results.documents} document(s) chauffeur`);
    if (results.documentsVehicules > 0) parts.push(`${results.documentsVehicules} document(s) véhicule`);
    if (results.factures > 0) parts.push(`${results.factures} facture(s)`);
    if (results.entretiens > 0) parts.push(`${results.entretiens} entretien(s)`);
    if (results.contratsCDD > 0) parts.push(`${results.contratsCDD} contrat(s) CDD`);
    if (results.contratsClients > 0) parts.push(`${results.contratsClients} contrat(s) client`);
    if (results.chauffeursDesactivates > 0) parts.push(`${results.chauffeursDesactivates} chauffeur(s) désactivé(s)`);

    return NextResponse.json({
      success: true,
      data: results,
      message: results.total > 0 || results.chauffeursDesactivates > 0
        ? `Alertes mises à jour: ${parts.join(', ')}`
        : 'Aucune nouvelle alerte',
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la vérification des alertes' },
      { status: 500 }
    );
  }
}
