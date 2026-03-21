"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatRIB } from "@/lib/format";

interface RIBInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Composant de saisie RIB avec masque automatique
 * Format: XXX XXX XXXXXXXXXXXXXXXX XX (24 chiffres)
 * Exemple: 011 780 0000123456789012 34
 */
export function RIBInput({ value, onChange, className, ...props }: RIBInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() => {
    // Si la valeur existe et fait 24 chiffres, la formater
    const cleaned = value ? value.replace(/\D/g, '') : '';
    if (cleaned.length === 24) {
      return formatRIB(cleaned);
    }
    // Sinon, formater ce qu'on a
    return formatPartialRIB(cleaned);
  });

  // Mettre à jour l'affichage quand la valeur externe change
  React.useEffect(() => {
    const cleaned = value ? value.replace(/\D/g, '') : '';
    if (cleaned.length === 24) {
      setDisplayValue(formatRIB(cleaned));
    } else {
      setDisplayValue(formatPartialRIB(cleaned));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Supprimer tout ce qui n'est pas un chiffre
    const cleaned = inputValue.replace(/\D/g, '');
    
    // Limiter à 24 chiffres
    const limited = cleaned.slice(0, 24);
    
    // Formater avec espaces pendant la saisie
    const formatted = formatPartialRIB(limited);
    
    setDisplayValue(formatted);
    
    // Retourner la valeur sans espaces (pour le stockage)
    onChange(limited);
  };

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      placeholder="011 780 0000123456789012 34"
      maxLength={27} // 24 chiffres + 3 espaces
      className={className}
    />
  );
}

/**
 * Formate un RIB partiel pendant la saisie
 */
function formatPartialRIB(digits: string): string {
  if (!digits) return '';
  
  let formatted = '';
  if (digits.length > 0) {
    formatted = digits.slice(0, 3);
  }
  if (digits.length > 3) {
    formatted += ' ' + digits.slice(3, 6);
  }
  if (digits.length > 6) {
    formatted += ' ' + digits.slice(6, 22);
  }
  if (digits.length > 22) {
    formatted += ' ' + digits.slice(22, 24);
  }
  
  return formatted;
}

export { formatRIB };
