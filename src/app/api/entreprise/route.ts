// Entreprise API - Get and Update company information
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse } from '@/types';

// GET /api/entreprise - Get company information
export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const entreprise = await db.entreprise.findFirst();
    
    return NextResponse.json({
      success: true,
      data: entreprise,
    });
  } catch (error) {
    console.error('Error fetching entreprise:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des informations' },
      { status: 500 }
    );
  }
}

// PUT /api/entreprise - Update company information
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const body = await request.json();
    const {
      nom,
      adresse,
      telephone,
      email,
      siteWeb,
      siret,
      tvaIntracommunautaire,
      rib,
      banque,
    } = body;

    // Get existing entreprise
    const existing = await db.entreprise.findFirst();

    let entreprise;
    
    if (existing) {
      // Update existing
      entreprise = await db.entreprise.update({
        where: { id: existing.id },
        data: {
          nom,
          adresse,
          telephone,
          email,
          siteWeb,
          siret,
          tvaIntracommunautaire,
          rib,
          banque,
        },
      });
    } else {
      // Create new
      entreprise = await db.entreprise.create({
        data: {
          nom,
          adresse,
          telephone,
          email,
          siteWeb,
          siret,
          tvaIntracommunautaire,
          rib,
          banque,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: entreprise,
      message: 'Informations de l\'entreprise mises à jour',
    });
  } catch (error) {
    console.error('Error updating entreprise:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
