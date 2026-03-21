import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Mapping from database keys to PDF params
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

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0) + ' MAD';
}

// Generate detailed Bulletin de Paie PDF directly
function generateBulletinPaieDetailPDF(data: {
  bulletin: any;
  chauffeur: any;
  company: Record<string, string>;
}): Buffer {
  const { bulletin, chauffeur, company } = data;
  const doc = new jsPDF();
  const nomEntreprise = company.nomEntreprise || 'MGK TRANSPORT';
  
  const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 102, 204);
  doc.text(nomEntreprise.toUpperCase(), 20, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  if (company.adresse) doc.text(company.adresse, 20, 28);
  
  const contactParts: string[] = [];
  if (company.telephone) contactParts.push(`Tél: ${company.telephone}`);
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (contactParts.length > 0) doc.text(contactParts.join(' | '), 20, 36);
  
  const registreParts: string[] = [];
  if (company.ice) registreParts.push(`ICE: ${company.ice}`);
  if (company.rc) registreParts.push(`RC: ${company.rc}`);
  if (registreParts.length > 0) doc.text(registreParts.join(' | '), 20, 44);

  // Title on right
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('BULLETIN DE PAIE', 190, 20, { align: 'right' });
  
  // Period badge
  doc.setFillColor(0, 102, 204);
  doc.rect(140, 28, 50, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${MONTHS[bulletin.mois - 1]} ${bulletin.annee}`, 165, 36, { align: 'center' });

  // Separator
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(20, 48, 190, 48);

  // Employee info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations du salarié', 20, 58);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  let y = 68;
  doc.setTextColor(102, 102, 102);
  doc.text('Nom complet :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`${chauffeur.prenom || ''} ${chauffeur.nom || ''}`, 60, y);
  
  y += 7;
  doc.setTextColor(102, 102, 102);
  doc.text('CIN :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.cin || '-', 60, y);
  
  y += 7;
  doc.setTextColor(102, 102, 102);
  doc.text('N° CNSS :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.numeroCNSS || '-', 60, y);
  
  y += 7;
  doc.setTextColor(102, 102, 102);
  doc.text('Téléphone :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.telephone || '-', 60, y);

  // Gains table
  y += 12;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Gains', 20, y);

  y += 5;
  const gainsBody: any[][] = [];
  
  if (bulletin.salaireBase > 0) gainsBody.push(['Salaire de base', formatCurrency(bulletin.salaireBase)]);
  if (bulletin.heuresSupplementaires > 0) gainsBody.push(['Heures supplémentaires', formatCurrency(bulletin.heuresSupplementaires)]);
  if (bulletin.primeTrajet > 0) gainsBody.push(['Prime de trajet', formatCurrency(bulletin.primeTrajet)]);
  if (bulletin.primeRendement > 0) gainsBody.push(['Prime de rendement', formatCurrency(bulletin.primeRendement)]);
  if (bulletin.indemniteDeplacement > 0) gainsBody.push(['Indemnité de déplacement', formatCurrency(bulletin.indemniteDeplacement)]);
  if (bulletin.indemnitePanier > 0) gainsBody.push(['Indemnité panier', formatCurrency(bulletin.indemnitePanier)]);
  if (bulletin.autresPrimes > 0) gainsBody.push(['Autres primes', formatCurrency(bulletin.autresPrimes)]);
  
  gainsBody.push([
    { content: 'Salaire Brut', styles: { fillColor: [240, 247, 255], textColor: [0, 102, 204], fontStyle: 'bold' } },
    { content: formatCurrency(bulletin.salaireBrut), styles: { fillColor: [240, 247, 255], textColor: [0, 102, 204], fontStyle: 'bold' } }
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Montant (DH)']],
    body: gainsBody,
    theme: 'grid',
    headStyles: { fillColor: [232, 244, 248], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Retenues table
  let currentY = (doc as any).lastAutoTable.finalY + 12;
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Retenues', 20, currentY);

  currentY += 5;
  const retenuesBody: any[][] = [];
  
  if (bulletin.cnss > 0) retenuesBody.push(['CNSS', formatCurrency(bulletin.cnss)]);
  if (bulletin.amo > 0) retenuesBody.push(['AMO', formatCurrency(bulletin.amo)]);
  if (bulletin.ir > 0) retenuesBody.push(['IR', formatCurrency(bulletin.ir)]);
  if (bulletin.avanceSalaire > 0) retenuesBody.push(['Avance sur salaire', formatCurrency(bulletin.avanceSalaire)]);
  if (bulletin.autresRetenues > 0) retenuesBody.push(['Autres retenues', formatCurrency(bulletin.autresRetenues)]);
  
  retenuesBody.push([
    { content: 'Total Retenues', styles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' } },
    { content: formatCurrency(bulletin.totalRetenues), styles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' } }
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Montant (DH)']],
    body: retenuesBody,
    theme: 'grid',
    headStyles: { fillColor: [254, 242, 242], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Net à payer
  currentY = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFillColor(0, 102, 204);
  doc.rect(20, currentY, 170, 18, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET À PAYER', 25, currentY + 12);
  doc.setFontSize(16);
  doc.text(formatCurrency(bulletin.salaireNet), 185, currentY + 12, { align: 'right' });

  // Signatures
  currentY += 35;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("Signature de l'employeur", 50, currentY, { align: 'center' });
  doc.text("Signature du salarié", 160, currentY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text('(Cachet et signature)', 50, currentY + 40, { align: 'center' });
  doc.text('(Lu et approuvé)', 160, currentY + 40, { align: 'center' });
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, currentY + 35, 85, currentY + 35);
  doc.line(115, currentY + 35, 185, currentY + 35);

  return Buffer.from(doc.output('arraybuffer'));
}

// GET /api/bulletins-paie/[id]/pdf - Generate PDF for bulletin directly
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get bulletin with chauffeur data
    const bulletin = await db.bulletinPaie.findUnique({
      where: { id },
      include: {
        chauffeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            cin: true,
            numeroCNSS: true,
            telephone: true,
            dateEmbauche: true,
            typeContrat: true,
            typeSalaire: true,
            montantSalaire: true,
            ribCompte: true,
          },
        },
      },
    });

    if (!bulletin) {
      return NextResponse.json(
        { success: false, error: 'Bulletin non trouvé' },
        { status: 404 }
      );
    }

    // Get company parameters from database
    const paramsFromDb = await db.parametre.findMany();
    const company: Record<string, string> = {};
    
    for (const param of paramsFromDb) {
      const pdfKey = dbKeyToPdfKey[param.cle];
      if (pdfKey) {
        company[pdfKey] = param.valeur;
      }
    }

    // Prepare data for PDF
    const pdfData = {
      bulletin: {
        id: bulletin.id,
        mois: bulletin.mois,
        annee: bulletin.annee,
        salaireBase: bulletin.salaireBase,
        heuresSupplementaires: bulletin.heuresSupplementaires,
        primeTrajet: bulletin.primeTrajet,
        primeRendement: bulletin.primeRendement,
        indemniteDeplacement: bulletin.indemniteDeplacement,
        indemnitePanier: bulletin.indemnitePanier,
        autresPrimes: bulletin.autresPrimes,
        salaireBrut: bulletin.salaireBrut,
        cnss: bulletin.cnss,
        amo: bulletin.amo,
        ir: bulletin.ir,
        avanceSalaire: bulletin.avanceSalaire,
        autresRetenues: bulletin.autresRetenues,
        totalRetenues: bulletin.totalRetenues,
        salaireNet: bulletin.salaireNet,
        dateGeneration: bulletin.dateGeneration.toISOString(),
      },
      chauffeur: {
        nom: bulletin.chauffeur.nom,
        prenom: bulletin.chauffeur.prenom,
        cin: bulletin.chauffeur.cin,
        numeroCNSS: bulletin.chauffeur.numeroCNSS,
        telephone: bulletin.chauffeur.telephone,
        typeContrat: bulletin.chauffeur.typeContrat,
        typeSalaire: bulletin.chauffeur.typeSalaire,
        ribCompte: bulletin.chauffeur.ribCompte,
      },
      company,
    };

    // Generate PDF directly
    const pdfBuffer = generateBulletinPaieDetailPDF(pdfData);
    
    console.log('[Bulletin PDF] PDF generated, size:', pdfBuffer.byteLength);

    // Month names
    const moisFr = [
      '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bulletin_${moisFr[bulletin.mois]}_${bulletin.annee}_${bulletin.chauffeur.nom}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('[Bulletin PDF] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du PDF: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}
