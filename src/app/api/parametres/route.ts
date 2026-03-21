import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/parametres - Get all parameters as array
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cle = searchParams.get('cle');

    if (cle) {
      // Get specific parameter by cle
      const param = await db.parametre.findFirst({
        where: { cle },
      });
      
      if (!param) {
        return NextResponse.json({ success: true, data: [] });
      }
      
      return NextResponse.json({ success: true, data: [param] });
    }

    // Get all parameters as array
    const params = await db.parametre.findMany();
    
    return NextResponse.json({ success: true, data: params });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des paramètres', data: [] },
      { status: 500 }
    );
  }
}

// POST /api/parametres - Create or update a parameter
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.cle || data.valeur === undefined) {
      return NextResponse.json(
        { success: false, error: 'La clé et la valeur sont requises' },
        { status: 400 }
      );
    }

    const param = await db.parametre.upsert({
      where: { cle: data.cle },
      update: { valeur: String(data.valeur) },
      create: { cle: data.cle, valeur: String(data.valeur) },
    });

    return NextResponse.json({ success: true, data: param });
  } catch (error) {
    console.error('Erreur lors de la création du paramètre:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du paramètre' },
      { status: 500 }
    );
  }
}

// PUT /api/parametres - Update multiple parameters at once
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Format de données invalide' },
        { status: 400 }
      );
    }

    const updates = [];
    for (const [cle, valeur] of Object.entries(data)) {
      if (typeof valeur === 'string') {
        updates.push(
          db.parametre.upsert({
            where: { cle },
            update: { valeur },
            create: { cle, valeur },
          })
        );
      }
    }

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: 'Paramètres mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}
