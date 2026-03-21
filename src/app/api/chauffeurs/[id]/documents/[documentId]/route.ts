import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, DocumentChauffeur } from '@/types';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { createDocumentAlert, resolveDocumentAlert } from '@/lib/alerts';

// GET /api/chauffeurs/[id]/documents/[documentId] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
): Promise<NextResponse<ApiResponse<DocumentChauffeur>>> {
  try {
    const { id, documentId } = await params;

    const document = await db.documentChauffeur.findFirst({
      where: {
        id: documentId,
        chauffeurId: id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du document' },
      { status: 500 }
    );
  }
}

// PUT /api/chauffeurs/[id]/documents/[documentId] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
): Promise<NextResponse<ApiResponse<DocumentChauffeur>>> {
  try {
    const { id, documentId } = await params;
    const formData = await request.formData();

    const type = formData.get('type') as string | null;
    const numero = formData.get('numero') as string | null;
    const dateExpiration = formData.get('dateExpiration') as string | null;
    const file = formData.get('file') as File | null;
    const removeFile = formData.get('removeFile') === 'true';

    // Check if document exists
    const existingDoc = await db.documentChauffeur.findFirst({
      where: { id: documentId, chauffeurId: id },
      include: {
        chauffeur: {
          select: { nom: true, prenom: true },
        },
      },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (type) {
      updateData.type = type;
    }

    if (numero !== null) {
      updateData.numero = numero || null;
    }

    let newExpirationDate: Date | null = null;
    if (dateExpiration !== null) {
      newExpirationDate = dateExpiration ? new Date(dateExpiration) : null;
      updateData.dateExpiration = newExpirationDate;
    }

    // Handle file removal
    if (removeFile && existingDoc.fichier) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', existingDoc.fichier);
        await unlink(oldFilePath);
      } catch {
        // Ignore error if file doesn't exist
      }
      updateData.fichier = null;
    }

    // Handle new file upload
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

      // Delete old file if exists
      if (existingDoc.fichier) {
        try {
          const oldFilePath = path.join(process.cwd(), 'public', existingDoc.fichier);
          await unlink(oldFilePath);
        } catch {
          // Ignore error
        }
      }

      // Create upload directory
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', id);
      await mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const fullPath = path.join(uploadDir, fileName);

      // Write file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(fullPath, buffer);

      updateData.fichier = `/uploads/documents/${id}/${fileName}`;
    }

    // Update document
    const document = await db.documentChauffeur.update({
      where: { id: documentId },
      data: updateData,
    });

    // Handle alerts for the updated document
    try {
      const effectiveExpirationDate = newExpirationDate || existingDoc.dateExpiration;
      const effectiveType = type || existingDoc.type;

      if (effectiveExpirationDate) {
        const now = new Date();
        const daysUntilExpiration = Math.ceil(
          (effectiveExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiration > 30) {
          // Document is now valid for more than 30 days, resolve any existing alert
          await resolveDocumentAlert(documentId);
        } else {
          // Document is still within alert threshold, create or update alert
          await createDocumentAlert(
            documentId,
            id,
            effectiveType,
            effectiveExpirationDate,
            existingDoc.chauffeur.nom,
            existingDoc.chauffeur.prenom
          );
        }
      }
    } catch (alertError) {
      console.error('Error updating document alert:', alertError);
      // Don't fail the document update if alert handling fails
    }

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du document' },
      { status: 500 }
    );
  }
}

// DELETE /api/chauffeurs/[id]/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id, documentId } = await params;

    // Check if document exists and belongs to this chauffeur
    const document = await db.documentChauffeur.findFirst({
      where: {
        id: documentId,
        chauffeurId: id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Delete file if exists
    if (document.fichier) {
      try {
        const filePath = path.join(process.cwd(), 'public', document.fichier);
        await unlink(filePath);
      } catch {
        // Ignore error if file doesn't exist
      }
    }

    // Delete associated alerts
    try {
      await db.alerte.deleteMany({
        where: { referenceId: documentId },
      });
    } catch {
      // Ignore error if no alerts exist
    }

    // Delete document from database
    await db.documentChauffeur.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    );
  }
}
