import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// GET /api/files/[...path] - Serve uploaded files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    
    // Reconstruct the file path
    const filePath = pathParts.join('/');
    
    // Security: prevent directory traversal attacks
    if (filePath.includes('..') || filePath.includes('\0')) {
      return NextResponse.json(
        { success: false, error: 'Chemin de fichier invalide' },
        { status: 400 }
      );
    }
    
    // Full path to the file in public/uploads
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      console.log('[Files API] File not found:', fullPath);
      return NextResponse.json(
        { success: false, error: 'Fichier non trouvé' },
        { status: 404 }
      );
    }
    
    // Read the file
    const fileBuffer = await readFile(fullPath);
    
    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Get file stats for last-modified header
    const fileStat = await stat(fullPath);
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Last-Modified': fileStat.mtime.toUTCString(),
        'Cache-Control': 'public, max-age=31536000',
        // For PDFs and images, allow inline viewing
        'Content-Disposition': ext === '.pdf' 
          ? `inline; filename="${path.basename(fullPath)}"`
          : `attachment; filename="${path.basename(fullPath)}"`,
      },
    });
  } catch (error) {
    console.error('[Files API] Error serving file:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la lecture du fichier' },
      { status: 500 }
    );
  }
}
