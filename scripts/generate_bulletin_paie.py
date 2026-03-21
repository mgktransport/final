#!/usr/bin/env python3
"""
Generate Professional Bulletin de Paie PDF for MGK Transport
Optimized for printing with company parameters from database
"""

import sys
import os
import json
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    Image, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Register fonts
FONT_DIR = '/usr/share/fonts/truetype'
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

# Colors - Professional palette
PRIMARY_COLOR = colors.HexColor('#1a365d')  # Dark blue
SECONDARY_COLOR = colors.HexColor('#2c5282')  # Medium blue
ACCENT_COLOR = colors.HexColor('#3182ce')  # Light blue
HEADER_BG = colors.HexColor('#f7fafc')  # Very light gray
SUCCESS_COLOR = colors.HexColor('#276749')  # Green
DANGER_COLOR = colors.HexColor('#c53030')  # Red
BORDER_COLOR = colors.HexColor('#e2e8f0')  # Light border

# Month names in French
MOIS_FR = [
    '', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
]


def format_currency(amount):
    """Format amount as currency"""
    if amount is None:
        return '0,00'
    return f'{amount:,.2f}'.replace(',', ' ').replace('.', ',')


def create_styles():
    """Create paragraph styles"""
    styles = getSampleStyleSheet()
    
    # Company name style
    styles.add(ParagraphStyle(
        name='CompanyName',
        fontName='DejaVuSans-Bold',
        fontSize=14,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=2
    ))
    
    # Company info style
    styles.add(ParagraphStyle(
        name='CompanyInfo',
        fontName='DejaVuSans',
        fontSize=8,
        textColor=colors.gray,
        alignment=TA_CENTER,
        spaceAfter=2
    ))
    
    # Title style
    styles.add(ParagraphStyle(
        name='MainTitle',
        fontName='DejaVuSans-Bold',
        fontSize=16,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=5
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='SubTitle',
        fontName='DejaVuSans',
        fontSize=11,
        textColor=SECONDARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=10
    ))
    
    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontName='DejaVuSans-Bold',
        fontSize=10,
        textColor=PRIMARY_COLOR,
        alignment=TA_LEFT,
        spaceBefore=8,
        spaceAfter=4
    ))
    
    # Normal text
    styles.add(ParagraphStyle(
        name='NormalText',
        fontName='DejaVuSans',
        fontSize=9,
        textColor=colors.black,
        alignment=TA_LEFT,
        spaceAfter=2
    ))
    
    # Table cell style
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='DejaVuSans',
        fontSize=9,
        textColor=colors.black,
        alignment=TA_LEFT,
        leftIndent=2,
        rightIndent=2
    ))
    
    # Table cell right aligned
    styles.add(ParagraphStyle(
        name='TableCellRight',
        fontName='DejaVuSans',
        fontSize=9,
        textColor=colors.black,
        alignment=TA_RIGHT,
        rightIndent=2
    ))
    
    # Table header style
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='DejaVuSans-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER
    ))
    
    # Footer style
    styles.add(ParagraphStyle(
        name='Footer',
        fontName='DejaVuSans',
        fontSize=7,
        textColor=colors.gray,
        alignment=TA_CENTER
    ))
    
    # Net to pay style
    styles.add(ParagraphStyle(
        name='NetToPay',
        fontName='DejaVuSans-Bold',
        fontSize=12,
        textColor=SUCCESS_COLOR,
        alignment=TA_CENTER
    ))
    
    # Label style
    styles.add(ParagraphStyle(
        name='Label',
        fontName='DejaVuSans-Bold',
        fontSize=8,
        textColor=colors.gray,
        alignment=TA_LEFT
    ))
    
    return styles


def create_header(company_params, logo_path, styles):
    """Create document header with logo and company info"""
    elements = []
    
    # Header table with logo and company info
    header_data = []
    
    # Logo column
    logo_col = []
    if logo_path and os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=2.5*cm, height=2*cm)
            logo.hAlign = 'CENTER'
            logo_col.append(logo)
        except Exception as e:
            print(f"Error loading logo: {e}", file=sys.stderr)
    
    # Company info column
    nom_entreprise = company_params.get('nomEntreprise', 'MGK TRANSPORT')
    adresse = company_params.get('adresse', '')
    telephone = company_params.get('telephone', '')
    email = company_params.get('email', '')
    ice = company_params.get('ice', '')
    rc = company_params.get('rc', '')
    cnss = company_params.get('cnss', '')
    ville = company_params.get('ville', '')
    
    company_lines = [
        Paragraph(f'<b>{nom_entreprise}</b>', styles['CompanyName']),
    ]
    
    if adresse:
        company_lines.append(Paragraph(adresse, styles['CompanyInfo']))
    if ville:
        company_lines.append(Paragraph(ville, styles['CompanyInfo']))
    if telephone:
        company_lines.append(Paragraph(f'Tel: {telephone}', styles['CompanyInfo']))
    if email:
        company_lines.append(Paragraph(f'Email: {email}', styles['CompanyInfo']))
    
    # Legal info
    legal_info = []
    if ice:
        legal_info.append(f'ICE: {ice}')
    if rc:
        legal_info.append(f'RC: {rc}')
    if cnss:
        legal_info.append(f'CNSS: {cnss}')
    
    if legal_info:
        company_lines.append(Paragraph(' | '.join(legal_info), styles['CompanyInfo']))
    
    header_data.append([logo_col, company_lines])
    
    header_table = Table(header_data, colWidths=[3.5*cm, 12.5*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 3*mm))
    
    # Horizontal line
    elements.append(HRFlowable(
        width='100%',
        thickness=1.5,
        color=PRIMARY_COLOR,
        spaceBefore=3,
        spaceAfter=8
    ))
    
    return elements


def create_title_section(bulletin, styles):
    """Create bulletin title section"""
    elements = []
    
    # Title
    title = Paragraph(
        '<b>BULLETIN DE PAIE</b>',
        ParagraphStyle(
            'BulletinTitle',
            fontName='DejaVuSans-Bold',
            fontSize=14,
            textColor=PRIMARY_COLOR,
            alignment=TA_CENTER,
            spaceAfter=5
        )
    )
    elements.append(title)
    
    # Period
    mois_label = MOIS_FR[bulletin.get('mois', 1)]
    annee = bulletin.get('annee', datetime.now().year)
    period = Paragraph(
        f'<b>Periode: {mois_label} {annee}</b>',
        ParagraphStyle(
            'Period',
            fontName='DejaVuSans',
            fontSize=10,
            textColor=SECONDARY_COLOR,
            alignment=TA_CENTER,
            spaceAfter=10
        )
    )
    elements.append(period)
    
    return elements


def create_employee_info(chauffeur, styles):
    """Create employee information section"""
    elements = []
    
    elements.append(Paragraph('<b>INFORMATIONS DU SALARIE</b>', styles['SectionHeader']))
    
    # Employee info table
    data = [
        [
            Paragraph('<b>Nom et Prenom:</b>', styles['TableCell']),
            Paragraph(f"{chauffeur.get('nom', '')} {chauffeur.get('prenom', '')}", styles['TableCell']),
            Paragraph('<b>CIN:</b>', styles['TableCell']),
            Paragraph(chauffeur.get('cin', '-'), styles['TableCell']),
        ],
        [
            Paragraph('<b>N CNSS:</b>', styles['TableCell']),
            Paragraph(chauffeur.get('numeroCNSS', '-') or '-', styles['TableCell']),
            Paragraph('<b>Poste:</b>', styles['TableCell']),
            Paragraph('Chauffeur', styles['TableCell']),
        ],
    ]
    
    # Add date d'embauche if available
    date_embauche = chauffeur.get('dateEmbauche')
    type_contrat = chauffeur.get('typeContrat')
    
    if date_embauche or type_contrat:
        row = [
            Paragraph('<b>Date d\'embauche:</b>', styles['TableCell']),
            Paragraph(date_embauche if date_embauche else '-', styles['TableCell']),
            Paragraph('<b>Type de contrat:</b>', styles['TableCell']),
            Paragraph(type_contrat if type_contrat else '-', styles['TableCell']),
        ]
        data.append(row)
    
    table = Table(data, colWidths=[3.2*cm, 4.8*cm, 3.2*cm, 4.8*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HEADER_BG),
        ('BACKGROUND', (2, 0), (2, -1), HEADER_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 4*mm))
    
    return elements


def create_gains_section(bulletin, styles):
    """Create gains section"""
    elements = []
    
    elements.append(Paragraph('<b>GAINS</b>', styles['SectionHeader']))
    
    # Gains table
    data = [
        [Paragraph('<b>Description</b>', styles['TableHeader']), 
         Paragraph('<b>Montant (DH)</b>', styles['TableHeader'])],
    ]
    
    gains = [
        ('Salaire de base', bulletin.get('salaireBase', 0)),
        ('Heures supplementaires', bulletin.get('heuresSupplementaires', 0)),
        ('Prime de trajet', bulletin.get('primeTrajet', 0)),
        ('Prime de rendement', bulletin.get('primeRendement', 0)),
        ('Indemnite de deplacement', bulletin.get('indemniteDeplacement', 0)),
        ('Indemnite panier', bulletin.get('indemnitePanier', 0)),
        ('Autres primes', bulletin.get('autresPrimes', 0)),
    ]
    
    for label, amount in gains:
        if amount > 0:
            data.append([
                Paragraph(label, styles['TableCell']),
                Paragraph(format_currency(amount), styles['TableCellRight']),
            ])
    
    # Total brut
    data.append([
        Paragraph('<b>SALAIRE BRUT</b>', styles['TableCell']),
        Paragraph(f'<b>{format_currency(bulletin.get("salaireBrut", 0))}</b>', styles['TableCellRight']),
    ])
    
    table = Table(data, colWidths=[12*cm, 4*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e6f4ea')),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 4*mm))
    
    return elements


def create_retenues_section(bulletin, styles):
    """Create deductions section"""
    elements = []
    
    elements.append(Paragraph('<b>RETENUES</b>', styles['SectionHeader']))
    
    # Retenues table
    data = [
        [Paragraph('<b>Description</b>', styles['TableHeader']), 
         Paragraph('<b>Montant (DH)</b>', styles['TableHeader'])],
    ]
    
    retenues = [
        ('CNSS', bulletin.get('cnss', 0)),
        ('AMO', bulletin.get('amo', 0)),
        ('IR (Impot sur le revenu)', bulletin.get('ir', 0)),
        ('Avance sur salaire', bulletin.get('avanceSalaire', 0)),
        ('Autres retenues', bulletin.get('autresRetenues', 0)),
    ]
    
    has_retenues = False
    for label, amount in retenues:
        if amount > 0:
            has_retenues = True
            data.append([
                Paragraph(label, styles['TableCell']),
                Paragraph(format_currency(amount), styles['TableCellRight']),
            ])
    
    # If no deductions, show zero
    if not has_retenues:
        data.append([
            Paragraph('Aucune retenue ce mois', styles['TableCell']),
            Paragraph('0,00', styles['TableCellRight']),
        ])
    
    # Total retenues
    data.append([
        Paragraph('<b>TOTAL RETENUES</b>', styles['TableCell']),
        Paragraph(f'<b>{format_currency(bulletin.get("totalRetenues", 0))}</b>', styles['TableCellRight']),
    ])
    
    table = Table(data, colWidths=[12*cm, 4*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DANGER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fce8e8')),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 4*mm))
    
    return elements


def create_net_section(bulletin, styles):
    """Create net to pay section"""
    elements = []
    
    elements.append(HRFlowable(
        width='100%',
        thickness=0.5,
        color=BORDER_COLOR,
        spaceBefore=3,
        spaceAfter=6
    ))
    
    # Net to pay table
    data = [
        [Paragraph('<b>NET A PAYER</b>', 
                   ParagraphStyle('NetLabel', fontName='DejaVuSans-Bold', fontSize=12, 
                                textColor=SUCCESS_COLOR, alignment=TA_RIGHT)),
         Paragraph(f'<b>{format_currency(bulletin.get("salaireNet", 0))} DH</b>',
                   ParagraphStyle('NetValue', fontName='DejaVuSans-Bold', fontSize=14,
                                textColor=SUCCESS_COLOR, alignment=TA_CENTER))],
    ]
    
    table = Table(data, colWidths=[10*cm, 6*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e6f4ea')),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8*mm))
    
    return elements


def create_footer_section(bulletin, styles, company_params):
    """Create footer section with signatures"""
    elements = []
    
    elements.append(HRFlowable(
        width='100%',
        thickness=0.5,
        color=BORDER_COLOR,
        spaceBefore=5,
        spaceAfter=3
    ))
    
    # Date generation
    date_gen = bulletin.get('dateGeneration', datetime.now().isoformat())
    if isinstance(date_gen, str):
        try:
            date_gen = datetime.fromisoformat(date_gen.replace('Z', '+00:00'))
        except:
            date_gen = datetime.now()
    
    footer_text = f"Bulletin genere le {date_gen.strftime('%d/%m/%Y a %H:%M')}"
    elements.append(Paragraph(footer_text, styles['Footer']))
    elements.append(Spacer(1, 5*mm))
    
    # Signature area
    sig_data = [
        [
            Paragraph('<b>Signature de l\'employeur</b>', 
                     ParagraphStyle('SigLabel', fontName='DejaVuSans', fontSize=8, 
                                  alignment=TA_CENTER, textColor=colors.gray)),
            Paragraph('', styles['NormalText']),
            Paragraph('<b>Signature du salarie</b>',
                     ParagraphStyle('SigLabel', fontName='DejaVuSans', fontSize=8,
                                  alignment=TA_CENTER, textColor=colors.gray)),
        ],
        ['', '', ''],
    ]
    
    sig_table = Table(sig_data, colWidths=[6*cm, 4*cm, 6*cm], rowHeights=[None, 1.8*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 5),
        ('BOX', (0, 1), (0, 1), 0.5, BORDER_COLOR),
        ('BOX', (2, 1), (2, 1), 0.5, BORDER_COLOR),
    ]))
    
    elements.append(sig_table)
    
    # Disclaimer
    elements.append(Spacer(1, 4*mm))
    nom_entreprise = company_params.get('nomEntreprise', 'MGK TRANSPORT')
    disclaimer = (
        f"Document genere par {nom_entreprise}. "
        "Ce bulletin de paie est un document officiel. "
        "En cas de reclamation, veuillez contacter le service RH."
    )
    elements.append(Paragraph(disclaimer, 
                             ParagraphStyle('Disclaimer', fontName='DejaVuSans', fontSize=6,
                                          textColor=colors.gray, alignment=TA_CENTER)))
    
    return elements


def generate_bulletin_pdf(bulletin_data, chauffeur_data, company_data, output_path, logo_path=None):
    """Generate the complete bulletin de paie PDF optimized for printing"""
    
    # Create document with print-optimized settings
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.2*cm,
        leftMargin=1.2*cm,
        topMargin=1*cm,
        bottomMargin=1*cm,
        title=f"Bulletin_de_paie_{chauffeur_data.get('nom', 'employe')}_{bulletin_data.get('mois', 1)}_{bulletin_data.get('annee', datetime.now().year)}",
        author=company_data.get('nomEntreprise', 'MGK Transport'),
        creator='MGK Transport - Systeme de Gestion'
    )
    
    # Create styles
    styles = create_styles()
    
    # Build elements
    elements = []
    
    # Header with company info
    elements.extend(create_header(company_data, logo_path, styles))
    
    # Title
    elements.extend(create_title_section(bulletin_data, styles))
    
    # Employee info
    elements.extend(create_employee_info(chauffeur_data, styles))
    
    # Gains
    elements.extend(create_gains_section(bulletin_data, styles))
    
    # Retenues
    elements.extend(create_retenues_section(bulletin_data, styles))
    
    # Net to pay
    elements.extend(create_net_section(bulletin_data, styles))
    
    # Footer with signatures
    elements.extend(create_footer_section(bulletin_data, styles, company_data))
    
    # Build PDF
    doc.build(elements)
    
    return output_path


def main():
    """Main function"""
    if len(sys.argv) < 5:
        print("Usage: python generate_bulletin_paie.py <bulletin_json_file> <chauffeur_json_file> <company_json_file> <output_path> [logo_path]")
        sys.exit(1)
    
    bulletin_json_file = sys.argv[1]
    chauffeur_json_file = sys.argv[2]
    company_json_file = sys.argv[3]
    output_path = sys.argv[4]
    logo_path = sys.argv[5] if len(sys.argv) > 5 else None
    
    # Read JSON data from files
    with open(bulletin_json_file, 'r', encoding='utf-8') as f:
        bulletin_data = json.load(f)
    
    with open(chauffeur_json_file, 'r', encoding='utf-8') as f:
        chauffeur_data = json.load(f)
    
    with open(company_json_file, 'r', encoding='utf-8') as f:
        company_data = json.load(f)
    
    # Generate PDF
    result = generate_bulletin_pdf(bulletin_data, chauffeur_data, company_data, output_path, logo_path)
    
    print(json.dumps({
        'success': True,
        'path': result,
        'message': 'PDF genere avec succes'
    }))


if __name__ == '__main__':
    main()
