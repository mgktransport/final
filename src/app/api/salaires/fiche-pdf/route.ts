import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface FicheSalaireData {
  chauffeurId: string;
  mois: number;
  annee: number;
  montantBase: number;
  montantPrimes: number;
  montantAvances: number;
  montantNet: number;
}

// Month names in French
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export async function POST(request: NextRequest) {
  try {
    const body: FicheSalaireData = await request.json();
    const { chauffeurId, mois, annee, montantBase, montantPrimes, montantAvances, montantNet } = body;

    // Get chauffeur details
    const chauffeur = await db.chauffeur.findUnique({
      where: { id: chauffeurId },
      include: {
        vehicules: {
          where: { actif: true },
          take: 1,
        },
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Get current salary record if exists
    const salaire = await db.salaire.findUnique({
      where: {
        chauffeurId_mois_annee: {
          chauffeurId,
          mois,
          annee,
        },
      },
    });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `fiche_salaire_${chauffeur.nom}_${MONTHS[mois - 1]}_${annee}_${timestamp}.pdf`;
    const outputPath = path.join('/tmp', filename);

    // Prepare data for Python script
    const pdfData = {
      chauffeur: {
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        cin: chauffeur.cin,
        telephone: chauffeur.telephone,
        dateEmbauche: chauffeur.dateEmbauche.toISOString(),
        typeContrat: chauffeur.typeContrat,
        typeSalaire: chauffeur.typeSalaire,
        montantSalaire: chauffeur.montantSalaire,
        montantCNSS: chauffeur.montantCNSS,
        montantAssurance: chauffeur.montantAssurance,
        ribCompte: chauffeur.ribCompte,
        vehicule: chauffeur.vehicules[0] ? {
          immatriculation: chauffeur.vehicules[0].immatriculation,
          marque: chauffeur.vehicules[0].marque,
          modele: chauffeur.vehicules[0].modele,
        } : null,
      },
      salaire: {
        mois,
        annee,
        moisNom: MONTHS[mois - 1],
        montantBase,
        montantPrimes,
        montantAvances,
        montantNet,
        heuresTravaillees: salaire?.heuresTravaillees,
        joursTravailles: salaire?.joursTravailles,
        paye: salaire?.paye || false,
        datePaiement: salaire?.datePaiement?.toISOString(),
      },
      outputPath,
      logoPath: '/home/z/my-project/upload/logo MGK.png',
    };

    // Create Python script for PDF generation
    const pythonScript = `
import json
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from datetime import datetime
import os

# Data - parse JSON string
data = json.loads('${JSON.stringify(pdfData).replace(/'/g, "\\'")}')

# Convert null to None for Python
def convert_null(obj):
    if obj is None:
        return None
    elif isinstance(obj, dict):
        return {k: convert_null(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_null(item) for item in obj]
    else:
        return obj

data = convert_null(data)

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Create document - reduced margins for single page
doc = SimpleDocTemplate(
    data['outputPath'],
    pagesize=A4,
    rightMargin=1.5*cm,
    leftMargin=1.5*cm,
    topMargin=1.5*cm,
    bottomMargin=1.5*cm,
    title=f"Fiche_Salaire_{data['chauffeur']['nom']}_{data['salaire']['moisNom']}_{data['salaire']['annee']}",
    author='MGK Transport',
    creator='MGK Transport',
    subject=f"Fiche de salaire - {data['salaire']['moisNom']} {data['salaire']['annee']}"
)

# Styles - more compact
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'Title',
    parent=styles['Title'],
    fontName='Times New Roman',
    fontSize=16,
    alignment=TA_CENTER,
    spaceAfter=8
)

header_style = ParagraphStyle(
    'Header',
    fontName='Times New Roman',
    fontSize=12,
    alignment=TA_CENTER,
    spaceAfter=6
)

normal_style = ParagraphStyle(
    'Normal',
    fontName='Times New Roman',
    fontSize=9,
    alignment=TA_LEFT,
    spaceAfter=4
)

label_style = ParagraphStyle(
    'Label',
    fontName='Times New Roman',
    fontSize=9,
    alignment=TA_LEFT,
    textColor=colors.HexColor('#666666')
)

value_style = ParagraphStyle(
    'Value',
    fontName='Times New Roman',
    fontSize=9,
    alignment=TA_LEFT,
)

story = []

# Header with logo - smaller
try:
    if os.path.exists(data['logoPath']):
        logo = Image(data['logoPath'], width=3*cm, height=1.5*cm)
        logo.hAlign = 'CENTER'
        story.append(logo)
except Exception as e:
    pass

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("MGK TRANSPORT", title_style))
story.append(Paragraph("FICHE DE SALAIRE", header_style))
story.append(Spacer(1, 0.3*cm))

# Period
period_text = f"<b>Periode: {data['salaire']['moisNom']} {data['salaire']['annee']}</b>"
story.append(Paragraph(period_text, ParagraphStyle('Period', fontName='Times New Roman', fontSize=11, alignment=TA_CENTER)))
story.append(Spacer(1, 0.5*cm))

# Employee info section
story.append(Paragraph("<b>INFORMATIONS DU CHAUFFEUR</b>", ParagraphStyle('Section', fontName='Times New Roman', fontSize=10, alignment=TA_LEFT, spaceAfter=6, textColor=colors.HexColor('#1F4E79'))))

chauffeur_data = data['chauffeur']
salaire_data = data['salaire']

info_data = [
    ['Nom complet:', f"{chauffeur_data['prenom']} {chauffeur_data['nom']}", 'CIN:', chauffeur_data['cin']],
    ['Telephone:', chauffeur_data['telephone'], 'Date embauche:', datetime.fromisoformat(chauffeur_data['dateEmbauche'].replace('Z', '+00:00')).strftime('%d/%m/%Y')],
    ['Type contrat:', chauffeur_data['typeContrat'], 'Type salaire:', chauffeur_data['typeSalaire'].replace('_', ' ')],
]

if chauffeur_data['vehicule']:
    info_data.append(['Vehicule:', f"{chauffeur_data['vehicule']['marque']} {chauffeur_data['vehicule']['modele']}", 'Immatriculation:', chauffeur_data['vehicule']['immatriculation']])

info_table = Table(info_data, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
info_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, -1), 'Times New Roman'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
    ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#666666')),
    ('FONTNAME', (1, 0), (1, -1), 'Times New Roman'),
    ('FONTNAME', (3, 0), (3, -1), 'Times New Roman'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(info_table)
story.append(Spacer(1, 0.5*cm))

# Salary details section
story.append(Paragraph("<b>DETAILS DU SALAIRE</b>", ParagraphStyle('Section', fontName='Times New Roman', fontSize=10, alignment=TA_LEFT, spaceAfter=6, textColor=colors.HexColor('#1F4E79'))))

# Format currency
def format_currency(amount):
    return f"{amount:,.2f} DH".replace(',', ' ')

# Salary calculation
salary_rows = [
    [Paragraph('<b>Description</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Heures/Jours</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Taux unitaire</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Montant</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=9, textColor=colors.white, alignment=TA_CENTER))],
]

# Base salary row
type_salaire = chauffeur_data['typeSalaire']
if type_salaire == 'HORAIRE':
    heures = salaire_data.get('heuresTravaillees') or 0
    salary_rows.append([
        'Salaire de base (Horaire)',
        f"{heures} h",
        format_currency(chauffeur_data['montantSalaire']) + '/h',
        format_currency(salaire_data['montantBase'])
    ])
elif type_salaire == 'PAR_TOURNEE':
    jours = salaire_data.get('joursTravailles') or 0
    salary_rows.append([
        'Salaire de base (Par tournee)',
        f"{jours} jours",
        format_currency(chauffeur_data['montantSalaire']) + '/jour',
        format_currency(salaire_data['montantBase'])
    ])
else:
    salary_rows.append([
        'Salaire de base (Fixe mensuel)',
        '-',
        '-',
        format_currency(salaire_data['montantBase'])
    ])

# Primes row
salary_rows.append([
    'Primes',
    '-',
    '-',
    f"+ {format_currency(salaire_data['montantPrimes'])}"
])

# Avances row
salary_rows.append([
    'Avances sur salaire',
    '-',
    '-',
    f"- {format_currency(salaire_data['montantAvances'])}"
])

# Total row
salary_rows.append([
    Paragraph('<b>NET A PAYER</b>', ParagraphStyle('total', fontName='Times New Roman', fontSize=10, alignment=TA_LEFT)),
    '',
    '',
    Paragraph(f'<b>{format_currency(salaire_data["montantNet"])}</b>', ParagraphStyle('total', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER))
])

salary_table = Table(salary_rows, colWidths=[5.5*cm, 3*cm, 3.5*cm, 3.5*cm])
salary_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, -1), 'Times New Roman'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8F4FD')),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(salary_table)
story.append(Spacer(1, 0.5*cm))

# Payment info
if salaire_data.get('paye') and salaire_data.get('datePaiement'):
    payment_date = datetime.fromisoformat(salaire_data.get('datePaiement').replace('Z', '+00:00')).strftime('%d/%m/%Y')
    story.append(Paragraph(f"<b>Statut:</b> PAYE le {payment_date}", ParagraphStyle('Status', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT, textColor=colors.HexColor('#2E7D32'))))
else:
    story.append(Paragraph("<b>Statut:</b> EN ATTENTE DE PAIEMENT", ParagraphStyle('Status', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT, textColor=colors.HexColor('#E65100'))))

story.append(Spacer(1, 0.5*cm))

# Bank details if available
if chauffeur_data.get('ribCompte'):
    story.append(Paragraph("<b>COORDONNEES BANCAIRES</b>", ParagraphStyle('Section', fontName='Times New Roman', fontSize=10, alignment=TA_LEFT, spaceAfter=4, textColor=colors.HexColor('#1F4E79'))))
    story.append(Paragraph(f"RIB: {chauffeur_data.get('ribCompte')}", normal_style))
    story.append(Spacer(1, 0.3*cm))

# Signature section
story.append(Spacer(1, 0.8*cm))
signature_data = [
    ['Signature du chauffeur', '', 'Signature de la direction'],
]
signature_table = Table(signature_data, colWidths=[6*cm, 4*cm, 6*cm])
signature_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, -1), 'Times New Roman'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('LINEBELOW', (0, 0), (0, 0), 0.5, colors.HexColor('#CCCCCC')),
    ('LINEBELOW', (2, 0), (2, 0), 0.5, colors.HexColor('#CCCCCC')),
    ('TOPPADDING', (0, 0), (-1, -1), 15),
]))
story.append(signature_table)

# Footer with date
story.append(Spacer(1, 0.5*cm))
footer_text = f"Fiche generee le {datetime.now().strftime('%d/%m/%Y a %H:%M')}"
story.append(Paragraph(footer_text, ParagraphStyle('Footer', fontName='Times New Roman', fontSize=7, alignment=TA_CENTER, textColor=colors.HexColor('#999999'))))

# Build PDF
doc.build(story)
print(f"PDF generated: {data['outputPath']}")
`;

    // Write Python script to temp file
    const scriptPath = path.join('/tmp', `generate_pdf_${timestamp}.py`);
    await writeFile(scriptPath, pythonScript, 'utf-8');

    // Execute Python script
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);

    if (stderr && !stderr.includes('PDF generated')) {
      console.error('Python stderr:', stderr);
    }

    // Read the generated PDF
    const pdfBuffer = await readFile(outputPath);

    // Cleanup temp files
    await unlink(scriptPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
