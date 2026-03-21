import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jsPDF } from 'jspdf';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Mapping des clés de la base de données vers les clés du PDF
const dbKeyToPdfKey: Record<string, string> = {
  'ENTREPRISE_NOM': 'nomEntreprise',
  'ENTREPRISE_ADRESSE': 'adresse',
  'ENTREPRISE_TELEPHONE': 'telephone',
  'ENTREPRISE_EMAIL': 'email',
  'ENTREPRISE_ICE': 'ice',
  'ENTREPRISE_RC': 'rc',
  'ENTREPRISE_CNSS': 'cnss',
  'ENTREPRISE_VILLE': 'ville',
  'ENTREPRISE_LOGO': 'logo',
};

// Helper functions
function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function getTypeContratLabel(type: string | undefined): string {
  const labels: Record<string, string> = {
    'CDI': 'Contrat à Durée Indéterminée (CDI)',
    'CDD': 'Contrat à Durée Déterminée (CDD)',
    'ANAEM': 'Contrat ANAEM',
    'TEMPORAIRE': 'Contrat Temporaire',
    'JOURNALIER': 'Journalier',
  };
  return type ? (labels[type] || type) : 'Non spécifié';
}

// Generate Attestation de Travail PDF directly
function generateAttestationPDF(chauffeur: any, company: Record<string, string>): Buffer {
  const doc = new jsPDF();
  const nomEntreprise = company.nomEntreprise || 'MGK TRANSPORT';
  const ville = company.ville || 'Casablanca';
  const today = new Date();
  const dateStr = `Fait à ${ville}, le ${today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  
  const nomComplet = `${chauffeur.prenom} ${chauffeur.nom}`;
  const cnss = chauffeur.numeroCNSS ? `, immatriculé(e) à la CNSS sous le N° ${chauffeur.numeroCNSS}` : '';
  const dateEmbauche = formatDate(chauffeur.dateEmbauche);
  const dateFin = chauffeur.dateFinContrat ? formatDate(chauffeur.dateFinContrat) : null;
  const aQuitte = dateFin && dateFin !== 'N/A';

  let mainText: string;
  if (aQuitte || !chauffeur.actif) {
    mainText = `Nous soussignés, ${nomEntreprise}, certifions par la présente que ${nomComplet}, titulaire de la CIN N° ${chauffeur.cin}${cnss}, a travaillé au sein de notre entreprise en qualité de CHAUFFEUR du ${dateEmbauche} au ${dateFin}.`;
  } else {
    mainText = `Nous soussignés, ${nomEntreprise}, certifions par la présente que ${nomComplet}, titulaire de la CIN N° ${chauffeur.cin}${cnss}, travaille au sein de notre entreprise en qualité de CHAUFFEUR depuis le ${dateEmbauche}.`;
  }

  // Header
  doc.setFontSize(18);
  doc.setTextColor(26, 54, 93);
  doc.text(nomEntreprise.toUpperCase(), 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(74, 85, 104);
  if (company.adresse) {
    doc.text(company.adresse, 105, 28, { align: 'center' });
  }
  
  const contactParts: string[] = [];
  if (company.telephone) contactParts.push(`Tél: ${company.telephone}`);
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' | '), 105, 36, { align: 'center' });
  }
  
  const registreParts: string[] = [];
  if (company.ice) registreParts.push(`ICE: ${company.ice}`);
  if (company.rc) registreParts.push(`RC: ${company.rc}`);
  if (registreParts.length > 0) {
    doc.text(registreParts.join(' | '), 105, 44, { align: 'center' });
  }

  // Separator
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(26, 54, 93);
  doc.text('ATTESTATION DE TRAVAIL', 105, 65, { align: 'center' });
  
  // Date
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(dateStr, 190, 80, { align: 'right' });

  // Body
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(mainText, 170);
  doc.text(splitText, 20, 95, { align: 'justify' });

  // Info section
  let yPos = 95 + (splitText.length * 7) + 15;
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Informations complémentaires :', 20, yPos, { underline: true });
  
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Poste occupé :', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Chauffeur', 70, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Type de contrat :', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(getTypeContratLabel(chauffeur.typeContrat), 70, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text("Date d'embauche :", 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(dateEmbauche, 70, yPos);

  if (dateFin && dateFin !== 'N/A') {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Date de départ :', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(dateFin, 70, yPos);
  }

  yPos += 15;
  doc.setFontSize(11);
  doc.text("Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.", 20, yPos, { align: 'justify', maxWidth: 170 });

  // Signatures
  yPos += 30;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("Signature de l'employeur", 50, yPos, { align: 'center' });
  doc.text("Signature de l'employé", 160, yPos, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('(Cachet et signature)', 50, yPos + 45, { align: 'center' });
  doc.text('(Lu et approuvé)', 160, yPos + 45, { align: 'center' });
  
  // Signature lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, yPos + 40, 85, yPos + 40);
  doc.line(115, yPos + 40, 185, yPos + 40);

  return Buffer.from(doc.output('arraybuffer'));
}

// GET /api/chauffeurs/[id]/attestation - Générer une attestation de travail PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Attestation] Generating attestation for chauffeur:', id);

    // Récupérer les données du chauffeur
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        cin: true,
        numeroCNSS: true,
        dateEmbauche: true,
        dateFinContrat: true,
        typeContrat: true,
        actif: true,
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    console.log('[Attestation] Chauffeur found:', chauffeur.nom, chauffeur.prenom);

    // Récupérer les paramètres de l'entreprise
    const parametres = await db.parametre.findMany();
    console.log('[Attestation] Found', parametres.length, 'parameters');
    
    // Construire l'objet company à partir des paramètres
    const company: Record<string, string> = {};
    for (const param of parametres) {
      const pdfKey = dbKeyToPdfKey[param.cle];
      if (pdfKey) {
        company[pdfKey] = param.valeur;
      }
    }

    // Générer le PDF directement
    const pdfBuffer = generateAttestationPDF(chauffeur, company);
    
    console.log('[Attestation] PDF generated, size:', pdfBuffer.byteLength);

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Attestation_Travail_${chauffeur.nom}_${chauffeur.prenom}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[Attestation] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération de l\'attestation de travail: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}
