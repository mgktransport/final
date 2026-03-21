#!/usr/bin/env python3
"""
Script de génération de fiche de salaire en PDF pour MGK Transport
"""

import json
import sys
import os
import tempfile
import base64
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from PIL import Image as PILImage

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4

# Month names in French
MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

def format_currency(amount):
    """Format amount as currency (MAD)"""
    if amount is None:
        return "0,00 DH"
    return f"{amount:,.2f}".replace(",", " ").replace(".", ",") + " DH"

def format_date(date_str):
    """Format date string to French format"""
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime("%d/%m/%Y")
    except:
        return date_str

def get_base64_image_size(base64_data):
    """Get image dimensions from base64 data"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        image_data = base64.b64decode(base64_data)
        img = PILImage.open(BytesIO(image_data))
        return img.size
    except:
        return (100, 100)

def create_logo_image(base64_data, max_width=3*cm, max_height=2*cm):
    """Create a ReportLab Image from base64 data with proper sizing"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        image_data = base64.b64decode(base64_data)
        img = PILImage.open(BytesIO(image_data))
        
        # Calculate aspect ratio
        orig_width, orig_height = img.size
        aspect = orig_width / orig_height
        
        # Calculate new size maintaining aspect ratio
        if aspect > (max_width / max_height):
            # Width is the limiting factor
            new_width = max_width
            new_height = max_width / aspect
        else:
            # Height is the limiting factor
            new_height = max_height
            new_width = max_height * aspect
        
        # Create temp file for the image
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        img.save(temp_file, format='PNG')
        temp_file.close()
        
        return Image(temp_file.name, width=new_width, height=new_height), temp_file.name
    except Exception as e:
        print(f"Error creating logo image: {e}", file=sys.stderr)
        return None, None

def generate_pdf(data, output_path):
    """Generate the salary sheet PDF"""
    
    # Extract data
    entreprise = data.get('entreprise', {})
    chauffeur = data.get('chauffeur', {})
    salaire = data.get('salaire', {})
    primes = data.get('primes', [])
    avances = data.get('avances', [])
    
    # Create PDF document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Title'],
        fontSize=16,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.gray,
        spaceAfter=10
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_LEFT
    )
    
    company_style = ParagraphStyle(
        'Company',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    company_info_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_LEFT,
        textColor=colors.gray
    )
    
    # Build content
    elements = []
    temp_files = []
    
    # ============== HEADER WITH LOGO AND COMPANY INFO ==============
    header_data = []
    
    # Logo column
    logo_img = None
    logo_base64 = entreprise.get('logo', '')
    if logo_base64:
        logo_img, temp_path = create_logo_image(logo_base64)
        if temp_path:
            temp_files.append(temp_path)
    
    if logo_img:
        header_data.append([logo_img])
    else:
        header_data.append([''])
    
    # Company info column (spanning rest of width)
    company_lines = []
    if entreprise.get('nom'):
        company_lines.append(f"<b>{entreprise['nom']}</b>")
    if entreprise.get('adresse'):
        company_lines.append(entreprise['adresse'])
    contact_parts = []
    if entreprise.get('telephone'):
        contact_parts.append(f"Tél: {entreprise['telephone']}")
    if entreprise.get('email'):
        contact_parts.append(f"Email: {entreprise['email']}")
    if contact_parts:
        company_lines.append(" | ".join(contact_parts))
    
    legal_parts = []
    if entreprise.get('ice'):
        legal_parts.append(f"ICE: {entreprise['ice']}")
    if entreprise.get('rc'):
        legal_parts.append(f"RC: {entreprise['rc']}")
    if entreprise.get('if'):
        legal_parts.append(f"IF: {entreprise['if']}")
    if legal_parts:
        company_lines.append(" | ".join(legal_parts))
    
    company_text = "<br/>".join(company_lines) if company_lines else ""
    
    # Create header table with logo and company info
    if logo_img:
        header_table_data = [
            [logo_img, Paragraph(company_text, company_style)]
        ]
        header_table = Table(header_table_data, colWidths=[3*cm, 14*cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('LEFTPADDING', (1, 0), (1, 0), 10),
        ]))
        elements.append(header_table)
    else:
        if company_text:
            elements.append(Paragraph(company_text, company_style))
    
    elements.append(Spacer(1, 0.3*cm))
    
    # Separator line
    separator = Table([['']],colWidths=[17*cm])
    separator.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.Color(0.2, 0.2, 0.2)),
    ]))
    elements.append(separator)
    elements.append(Spacer(1, 0.3*cm))
    
    # ============== TITLE ==============
    mois_name = MONTHS[salaire.get('mois', 1) - 1]
    annee = salaire.get('annee', datetime.now().year)
    
    elements.append(Paragraph("FICHE DE SALAIRE", title_style))
    elements.append(Paragraph(f"Période: {mois_name} {annee}", subtitle_style))
    elements.append(Spacer(1, 0.4*cm))
    
    # ============== CHAUFFEUR INFO ==============
    chauffeur_info_title = ParagraphStyle(
        'ChauffeurTitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.Color(0.2, 0.2, 0.6),
        spaceAfter=4
    )
    
    elements.append(Paragraph("INFORMATIONS DU CHAUFFEUR", chauffeur_info_title))
    
    # Chauffeur details table
    chauffeur_name = f"{chauffeur.get('prenom', '')} {chauffeur.get('nom', '')}".strip()
    chauffeur_data = [
        ['Nom complet:', chauffeur_name, 'CIN:', chauffeur.get('cin', '')],
        ['Téléphone:', chauffeur.get('telephone', ''), 'Date embauche:', format_date(chauffeur.get('dateEmbauche'))],
        ['Type contrat:', chauffeur.get('typeContrat', ''), 'Type salaire:', chauffeur.get('typeSalaire', '')],
    ]
    
    # Add RIB on its own line if available
    rib_compte = chauffeur.get('ribCompte', '')
    if rib_compte:
        chauffeur_data.append(['N Compte Bancaire (RIB):', '          ' + rib_compte, '', ''])
    
    chauffeur_table = Table(chauffeur_data, colWidths=[4*cm, 5*cm, 4*cm, 4*cm])
    chauffeur_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.gray),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.gray),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('SPAN', (1, -1), (3, -1)),  # Span RIB value across remaining columns
    ]))
    elements.append(chauffeur_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ============== SALARY CALCULATION ==============
    salary_title = ParagraphStyle(
        'SalaryTitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.Color(0.2, 0.2, 0.6),
        spaceAfter=4
    )
    
    elements.append(Paragraph("CALCUL DU SALAIRE", salary_title))
    
    # Salary calculation table
    montant_base = salaire.get('montantBase', 0)
    montant_primes = salaire.get('montantPrimes', 0)
    montant_avances = salaire.get('montantAvances', 0)
    montant_net = salaire.get('montantNet', 0)
    
    salary_data = [
        ['Description', 'Montant'],
        ['Salaire de base', format_currency(montant_base)],
        ['Primes', f"+ {format_currency(montant_primes)}"],
        ['Avances sur salaire', f"- {format_currency(montant_avances)}"],
        ['NET À PAYER', format_currency(montant_net)],
    ]
    
    salary_table = Table(salary_data, colWidths=[12*cm, 5*cm])
    salary_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        
        # Body rows
        ('FONTSIZE', (0, 1), (-1, -2), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        
        # Net row (highlighted)
        ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.2, 0.4, 0.6)),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('BOX', (0, 0), (-1, -1), 1, colors.Color(0.5, 0.5, 0.5)),
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(salary_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ============== PRIMES DETAILS (if any) ==============
    if primes and len(primes) > 0:
        primes_title = ParagraphStyle(
            'PrimesTitle',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.Color(0.2, 0.5, 0.2),
            spaceAfter=3
        )
        
        elements.append(Paragraph("DÉTAIL DES PRIMES", primes_title))
        
        primes_data = [['Date', 'Motif', 'Montant']]
        for prime in primes:
            primes_data.append([
                format_date(prime.get('date')),
                prime.get('motif', '')[:50],  # Truncate long motifs
                format_currency(prime.get('montant', 0))
            ])
        
        # Add total row
        primes_data.append(['', 'Total primes', format_currency(montant_primes)])
        
        primes_table = Table(primes_data, colWidths=[3*cm, 10*cm, 4*cm])
        primes_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.95, 0.9)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            
            # Total row
            ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.85, 0.9, 0.85)),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            
            # Alignment
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.85, 0.85, 0.85)),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.Color(0.7, 0.7, 0.7)),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(primes_table)
        elements.append(Spacer(1, 0.4*cm))
    
    # ============== AVANCES DETAILS (if any) ==============
    if avances and len(avances) > 0:
        avances_title = ParagraphStyle(
            'AvancesTitle',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.Color(0.6, 0.2, 0.2),
            spaceAfter=3
        )
        
        elements.append(Paragraph("DÉTAIL DES AVANCES", avances_title))
        
        avances_data = [['Date', 'Montant']]
        for avance in avances:
            avances_data.append([
                format_date(avance.get('date')),
                format_currency(avance.get('montant', 0))
            ])
        
        # Add total row
        avances_data.append(['Total avances', format_currency(montant_avances)])
        
        avances_table = Table(avances_data, colWidths=[5*cm, 4*cm])
        avances_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.95, 0.9, 0.9)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            
            # Total row
            ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.9, 0.85, 0.85)),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            
            # Alignment
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.85, 0.85, 0.85)),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.Color(0.7, 0.7, 0.7)),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(avances_table)
        elements.append(Spacer(1, 0.5*cm))
    
    # ============== PAYMENT STATUS ==============
    payment_status = salaire.get('paye', False)
    date_paiement = format_date(salaire.get('datePaiement'))
    
    status_text = "PAYÉ" if payment_status else "EN ATTENTE DE PAIEMENT"
    status_color = colors.Color(0.2, 0.6, 0.2) if payment_status else colors.Color(0.8, 0.4, 0.1)
    
    status_style = ParagraphStyle(
        'Status',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        textColor=status_color,
        spaceAfter=4
    )
    
    elements.append(Paragraph(f"Statut: {status_text}", status_style))
    if payment_status and date_paiement:
        elements.append(Paragraph(f"Date de paiement: {date_paiement}", subtitle_style))
    
    elements.append(Spacer(1, 0.8*cm))
    
    # ============== FOOTER ==============
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=7,
        alignment=TA_CENTER,
        textColor=colors.gray
    )
    
    elements.append(Paragraph(
        f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - MGK Transport",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    
    # Cleanup temp files
    for temp_path in temp_files:
        try:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        except:
            pass
    
    return output_path

def main():
    """Main function - reads JSON data from stdin or file and generates PDF"""
    
    if len(sys.argv) < 3:
        print("Usage: python generate_salary_pdf.py <input_json_file> <output_pdf_file>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        # Read JSON data from file
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Generate PDF
        result = generate_pdf(data, output_file)
        print(f"PDF generated successfully: {result}")
        
    except Exception as e:
        print(f"Error generating PDF: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
