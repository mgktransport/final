import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/types-documents/[id] - Récupérer un type de document par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const typeDocument = await db.typeDocumentPersonnalise.findUnique({
      where: { id }
    });

    if (!typeDocument) {
      return NextResponse.json(
        { success: false, error: 'Type de document non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: typeDocument });
  } catch (error) {
    console.error('Erreur lors de la récupération du type de document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du type de document' },
      { status: 500 }
    );
  }
}

// PUT /api/types-documents/[id] - Mettre à jour un type de document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, nom, description, categorie, actif } = body;

    // Vérifier si le type existe
    const existing = await db.typeDocumentPersonnalise.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Type de document non trouvé' },
        { status: 404 }
      );
    }

    // Si le code change, vérifier qu'il n'existe pas déjà
    if (code && code.toUpperCase() !== existing.code) {
      const codeExists = await db.typeDocumentPersonnalise.findUnique({
        where: { code: code.toUpperCase() }
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Ce code de type de document existe déjà' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (code) updateData.code = code.toUpperCase();
    if (nom) updateData.nom = nom;
    if (description !== undefined) updateData.description = description || null;
    if (categorie) updateData.categorie = categorie;
    if (actif !== undefined) updateData.actif = actif;

    const updated = await db.typeDocumentPersonnalise.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du type de document' },
      { status: 500 }
    );
  }
}

// DELETE /api/types-documents/[id] - Supprimer un type de document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier si le type existe
    const existing = await db.typeDocumentPersonnalise.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Type de document non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier s'il y a des documents utilisant ce type
    const documentsUsingType = await db.documentChauffeur.count({
      where: { type: existing.code }
    });

    if (documentsUsingType > 0) {
      // Désactiver au lieu de supprimer
      await db.typeDocumentPersonnalise.update({
        where: { id },
        data: { actif: false }
      });
      return NextResponse.json({ 
        success: true, 
        message: 'Type désactivé car utilisé par des documents existants',
        data: { id, actif: false }
      });
    }

    await db.typeDocumentPersonnalise.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Type de document supprimé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du type de document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du type de document' },
      { status: 500 }
    );
  }
}
