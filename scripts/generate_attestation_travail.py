#!/usr/bin/env python3
"""
Script pour générer une attestation de travail en PDF pour les chauffeurs.
Usage: python generate_attestation_travail.py <chauffeur_json_file> <company_json_file> <output_path> [logo_path]
"""

import sys
import json
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

def create_attestation_travail(chauffeur_file, company_file, output_path, logo_path=None):
    """Génère une attestation de travail en PDF."""
    
    # Charger les données
    with open(chauffeur_file, 'r', encoding='utf-8') as f:
        chauffeur = json.load(f)
    
    with open(company_file, 'r', encoding='utf-8') as f:
        company = json.load(f)
    
    # Créer le document PDF
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Style pour le titre de l'entreprise
    company_title_style = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=0.2*cm,
        textColor=colors.HexColor('#1a365d'),
        fontName='Helvetica-Bold'
    )
    
    # Style pour les infos entreprise
    company_info_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        spaceAfter=0.1*cm,
        textColor=colors.HexColor('#4a5568')
    )
    
    # Style pour le titre ATTESTATION
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=1*cm,
        spaceBefore=1*cm,
        textColor=colors.HexColor('#1a365d'),
        fontName='Helvetica-Bold',
        borderWidth=1,
        borderColor=colors.HexColor('#1a365d'),
        borderPadding=10
    )
    
    # Style pour le corps du texte
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=0.5*cm,
        leading=18
    )
    
    # Style pour les informations
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_LEFT,
        spaceAfter=0.3*cm,
        leftIndent=1*cm
    )
    
    # Style pour la date
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_RIGHT,
        spaceAfter=1*cm,
        spaceBefore=0.5*cm
    )
    
    # Style pour la signature
    signature_style = ParagraphStyle(
        'SignatureStyle',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_CENTER,
        spaceBefore=2*cm
    )
    
    # Construire le contenu
    elements = []
    
    # === EN-TÊTE ENTREPRISE ===
    # Logo si disponible
    if logo_path and os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=3*cm, height=3*cm)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 0.3*cm))
        except:
            pass
    
    # Nom de l'entreprise
    nom_entreprise = company.get('nomEntreprise', company.get('ENTREPRISE_NOM', 'MGK TRANSPORT'))
    elements.append(Paragraph(nom_entreprise.upper(), company_title_style))
    
    # Adresse
    adresse = company.get('adresse', company.get('ENTREPRISE_ADRESSE', ''))
    if adresse:
        elements.append(Paragraph(adresse, company_info_style))
    
    # Téléphone et Email
    tel = company.get('telephone', company.get('ENTREPRISE_TELEPHONE', ''))
    email = company.get('email', company.get('ENTREPRISE_EMAIL', ''))
    contact_info = []
    if tel:
        contact_info.append(f"Tél: {tel}")
    if email:
        contact_info.append(f"Email: {email}")
    if contact_info:
        elements.append(Paragraph(" | ".join(contact_info), company_info_style))
    
    # ICE et RC
    ice = company.get('ice', company.get('ENTREPRISE_ICE', ''))
    rc = company.get('rc', company.get('ENTREPRISE_RC', ''))
    registre_info = []
    if ice:
        registre_info.append(f"ICE: {ice}")
    if rc:
        registre_info.append(f"RC: {rc}")
    if registre_info:
        elements.append(Paragraph(" | ".join(registre_info), company_info_style))
    
    # Ligne de séparation
    elements.append(Spacer(1, 0.5*cm))
    line_data = [['']]
    line_table = Table(line_data, colWidths=[16*cm])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#1a365d')),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # === TITRE ATTESTATION ===
    elements.append(Paragraph("ATTESTATION DE TRAVAIL", title_style))
    
    # === DATE ===
    today = datetime.now()
    # Récupérer la ville, avec fallback sur Casablanca
    ville = company.get('ville') or company.get('ENTREPRISE_VILLE') or 'Casablanca'
    date_str = f"Fait à {ville}, le {today.strftime('%d/%m/%Y')}"
    elements.append(Paragraph(date_str, date_style))
    
    # === CORPS DU TEXTE ===
    # Préparation des données du chauffeur
    nom_complet = f"{chauffeur.get('nom', '')} {chauffeur.get('prenom', '')}".strip()
    cin = chauffeur.get('cin', '')
    numero_cnss = chauffeur.get('numeroCNSS', chauffeur.get('numeroCnss', ''))
    
    # Date d'embauche
    date_embauche = chauffeur.get('dateEmbauche', '')
    if date_embauche:
        try:
            dt_embauche = datetime.fromisoformat(date_embauche.replace('Z', '+00:00'))
            date_embauche_str = dt_embauche.strftime('%d/%m/%Y')
        except:
            date_embauche_str = date_embauche
    else:
        date_embauche_str = "N/A"
    
    # Date de fin de contrat
    date_fin = chauffeur.get('dateFinContrat', '')
    if date_fin:
        try:
            dt_fin = datetime.fromisoformat(date_fin.replace('Z', '+00:00'))
            date_fin_str = dt_fin.strftime('%d/%m/%Y')
            a_quitte = True
        except:
            date_fin_str = date_fin
            a_quitte = True
    else:
        date_fin_str = None
        a_quitte = False
    
    # Statut actif
    actif = chauffeur.get('actif', True)
    
    # Texte principal
    if a_quitte or not actif:
        # Ancien employé
        texte_principal = f"""
        Nous soussignés, <b>{nom_entreprise}</b>, certifions par la présente que <b>{nom_complet}</b>, 
        titulaire de la CIN N° <b>{cin}</b>{f', immatriculé(e) à la CNSS sous le N° {numero_cnss}' if numero_cnss else ''}, 
        a travaillé au sein de notre entreprise en qualité de <b>CHAUFFEUR</b> du <b>{date_embauche_str}</b> 
        au <b>{date_fin_str}</b>.
        """
    else:
        # Employé actuel
        texte_principal = f"""
        Nous soussignés, <b>{nom_entreprise}</b>, certifions par la présente que <b>{nom_complet}</b>, 
        titulaire de la CIN N° <b>{cin}</b>{f', immatriculé(e) à la CNSS sous le N° {numero_cnss}' if numero_cnss else ''}, 
        travaille au sein de notre entreprise en qualité de <b>CHAUFFEUR</b> depuis le <b>{date_embauche_str}</b>.
        """
    
    elements.append(Paragraph(texte_principal, body_style))
    
    # === INFORMATIONS COMPLÉMENTAIRES ===
    elements.append(Spacer(1, 0.3*cm))
    elements.append(Paragraph("<b>Informations complémentaires :</b>", body_style))
    
    # Type de contrat
    type_contrat = chauffeur.get('typeContrat', '')
    type_contrat_display = {
        'CDI': 'Contrat à Durée Indéterminée (CDI)',
        'CDD': 'Contrat à Durée Déterminée (CDD)',
        'ANAEM': 'Contrat ANAEM',
        'TEMPORAIRE': 'Contrat Temporaire'
    }.get(type_contrat, type_contrat if type_contrat else 'Non spécifié')
    
    info_data = [
        ['Poste occupé :', 'Chauffeur'],
        ['Type de contrat :', type_contrat_display],
        ["Date d'embauche :", date_embauche_str],
    ]
    
    if date_fin_str:
        info_data.append(["Date de départ :", date_fin_str])
    
    info_table = Table(info_data, colWidths=[5*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    
    # === TEXTE DE CLÔTURE ===
    elements.append(Spacer(1, 0.5*cm))
    texte_cloture = """
    Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
    """
    elements.append(Paragraph(texte_cloture, body_style))
    
    # === SIGNATURES ===
    elements.append(Spacer(1, 1.5*cm))
    
    # Créer un tableau pour les signatures
    signature_data = [
        ['Signature de l\'employeur', '', 'Signature de l\'employé'],
        ['', '', ''],
        ['', '', ''],
        ['(Cachet et signature)', '', '(Lu et approuvé)']
    ]
    
    signature_table = Table(signature_data, colWidths=[6*cm, 4*cm, 6*cm])
    signature_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 2), (0, 2), 1, colors.black),
        ('LINEBELOW', (2, 2), (2, 2), 1, colors.black),
    ]))
    elements.append(signature_table)
    
    # Générer le PDF
    doc.build(elements)
    print(f"Attestation de travail générée: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python generate_attestation_travail.py <chauffeur_json_file> <company_json_file> <output_path> [logo_path]")
        sys.exit(1)
    
    chauffeur_file = sys.argv[1]
    company_file = sys.argv[2]
    output_path = sys.argv[3]
    logo_path = sys.argv[4] if len(sys.argv) > 4 else None
    
    create_attestation_travail(chauffeur_file, company_file, output_path, logo_path)
