import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, DocumentChauffeur } from '@/types';
import { createDocumentAlert, resolveDocumentAlert } from '@/lib/alerts';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

// GET /api/chauffeurs/[id]/documents - List documents for chauffeur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<DocumentChauffeur[]>>> {
  try {
    const { id } = await params;

    // Check if chauffeur exists
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    const documents = await db.documentChauffeur.findMany({
      where: { chauffeurId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

// POST /api/chauffeurs/[id]/documents - Add document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<DocumentChauffeur>>> {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const type = formData.get('type') as string;
    const numero = formData.get('numero') as string | null;
    const dateExpiration = formData.get('dateExpiration') as string | null;
    const file = formData.get('file') as File | null;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Le type de document est obligatoire' },
        { status: 400 }
      );
    }

    if (!dateExpiration) {
      return NextResponse.json(
        { success: false, error: 'La date d\'expiration est obligatoire' },
        { status: 400 }
      );
    }

    // Check if chauffeur exists
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      select: { id: true, actif: true, nom: true, prenom: true },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Handle file upload using Cloudinary
    let filePath: string | null = null;
    if (file && file.size > 0) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Le fichier ne doit pas dépasser 5MB' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: 'Type de fichier non autorisé (PDF, JPG, PNG uniquement)' },
          { status: 400 }
        );
      }

      // Upload to Cloudinary
      const uploadResult = await uploadFileToCloudinary(file, `chauffeurs/${id}/documents`);
      if (uploadResult.success && uploadResult.url) {
        filePath = uploadResult.url;
      } else {
        console.error('Cloudinary upload failed:', uploadResult.error);
        // Continue without file path if upload fails
      }
    }

    // Create document
    const document = await db.documentChauffeur.create({
      data: {
        chauffeurId: id,
        type: type,
        numero: numero || null,
        dateExpiration: new Date(dateExpiration),
        fichier: filePath,
      },
    });

    // Create alert if document is expiring soon or already expired
    try {
      await createDocumentAlert(
        document.id,
        id,
        type,
        new Date(dateExpiration),
        chauffeur.nom,
        chauffeur.prenom
      );
    } catch (alertError) {
      console.error('Error creating document alert:', alertError);
      // Don't fail the document creation if alert creation fails
    }

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document ajouté avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du document' },
      { status: 500 }
    );
  }
}
