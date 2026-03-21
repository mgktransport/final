import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// API pour les types de documents personnalisés
// GET /api/types-documents - Liste tous les types de documents personnalisés
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categorie = searchParams.get('categorie');
    const actif = searchParams.get('actif');

    const where: any = {};
    
    if (categorie) {
      where.categorie = categorie;
    }
    
    if (actif !== null) {
      where.actif = actif === 'true';
    }

    const types = await db.typeDocumentPersonnalise.findMany({
      where,
      orderBy: [
        { categorie: 'asc' },
        { nom: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    console.error('Erreur lors de la récupération des types de documents:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des types de documents' },
      { status: 500 }
    );
  }
}

// POST /api/types-documents - Créer un nouveau type de document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, nom, description, categorie, actif } = body;

    // Validation
    if (!code || !nom) {
      return NextResponse.json(
        { success: false, error: 'Le code et le nom sont obligatoires' },
        { status: 400 }
      );
    }

    // Vérifier si le code existe déjà
    const existing = await db.typeDocumentPersonnalise.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ce code de type de document existe déjà' },
        { status: 400 }
      );
    }

    const typeDocument = await db.typeDocumentPersonnalise.create({
      data: {
        code: code.toUpperCase(),
        nom,
        description: description || null,
        categorie: categorie || 'CHAUFFEUR',
        actif: actif !== undefined ? actif : true
      }
    });

    return NextResponse.json({ success: true, data: typeDocument }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du type de document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du type de document' },
      { status: 500 }
    );
  }
}
