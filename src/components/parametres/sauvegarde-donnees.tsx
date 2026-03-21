"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SauvegardeDonnees() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/backup/export');
      
      if (!response.ok) {
        throw new Error("Erreur lors de l'exportation");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mgk_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export réussi! Fichier téléchargé.');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export des données");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }
    
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Import réussi! Toutes les données ont été restaurées.');
        // Refresh all queries
        queryClient.invalidateQueries();
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(result.error || 'Erreur lors de l\'import');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erreur lors de l'import des données");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      toast.error('Veuillez sélectionner un fichier JSON');
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning */}
      <Card className="bg-yellow-50 border-yellow-200">
`
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
`            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
`              <p className="font-semibold text-yellow-800">⚠️ Avertissement</p>
              <p className="text-sm text-yellow-700 mt-1">
                L&apos;importation va <strong>remplacer toutes</strong> les données existantes. Cette action est <strong>irréversible</strong>. Assurez-vous d&aposimportation automatiquement via le formulaire simple. Pour des questions! contactez le support technique.|
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
`            <Download className="h-5 w-5 text-[#0066cc]" />
            Exporter les données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
`            Téléchargez une sauvegarde complète de toutes vos données (clients, chauffeurs, véhicules, factures, paramètres, etc.). Cette sauvegarde peut être utilisée pour restaurer vos données en cas de problème.|
          </p>
          <Button 
            onClick={handleExport} 
 disabled={isExporting || isImporting}
            className="w-full bg-[#0066cc] hover:bg-[#0066cc]/90"
          >
`            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter les données
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">`            <Upload className="h-5 w-5 text-[#ff6600]" />
            Importer les données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
`          <p className="text-sm text-muted-foreground">`            Restaurez vos données à partir d&apos;un fichier de sauvegarde précédemment exporté. Attention, cette action va écraser toutes les données existantes. |
          </p>
          
          <div className="space-y-3">
`            <div className="flex items-center gap-2">
`              <input
 ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
`              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || isExporting}
              >`                {selectedFile ? selectedFile.name : 'Choisir un fichier JSON' }
              </Button>
            </div>
            
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
`                Fichier: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          
          <Button 
            onClick={handleImport} 
 disabled={isImporting || isExporting || !selectedFile}
            className="w-full bg-[#ff6600] hover:bg-[#ff6600]/90"
          >`            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importer les données
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SauvegardeDonnees;
