import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';

// UI Components from your project
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Languages, Download } from 'lucide-react';


function App() {
  // --- STATE MANAGEMENT ---
  // This is your existing state, which is correct.
  const [resultData, setResultData] = useState({
    originalPages: 25,
    translatedPages: 25,
    wordMappings: 1013,
    preservedElements: 497,
    confidence: 70,
    medicalTerms: 2,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState('');


  // --- FUNCTIONS ---

  //
  // THIS IS THE CORRECTED EXPORT FUNCTION
  // It now contains the critical fix for loading the Arabic font.
  //
  const handleExportClick = async () => {
    setIsExporting(true);
    setProgress(0);
    setExportError('');

    try {
      // 1. Create the jsPDF instance
      const doc = new jsPDF();
      setProgress(10);

      // 2. Load the font file from your public folder
      console.log('Loading Arabic font...');
      const fontResponse = await fetch('/fonts/NotoSansArabic-Regular.ttf');
      if (!fontResponse.ok) {
        throw new Error("Font file not found. Make sure NotoSansArabic-Regular.ttf is in the public/fonts/ folder.");
      }
      const fontBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontBuffer)));
      setProgress(30);

      // 3. Add the font to the PDF document
      doc.addFileToVFS('NotoSansArabic-Regular.ttf', fontBase64);
      doc.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
      doc.setFont('NotoSansArabic'); // Set this font as active
      console.log('Arabic font loaded and set.');
      setProgress(50);
      
      // 4. Now, add your content (including Arabic text)
      doc.text(`Translation Complete - اكتملت الترجمة`, 20, 20); // Example with Arabic
      doc.text(`Original Pages: ${resultData.originalPages}`, 20, 30);
      doc.text(`Word Mappings: ${resultData.wordMappings}`, 20, 40);
      doc.text(`Translation Confidence: ${resultData.confidence}%`, 20, 50);
      setProgress(75);
      
      // 5. Generate and save the file
      const pdfData = doc.output('datauristring').split(',')[1];
      const fileName = `translation-${Date.now()}.pdf`;

      await Filesystem.writeFile({
        path: fileName,
        data: pdfData,
        directory: Directory.Documents,
      });
      setProgress(100);
      console.log(`File saved as ${fileName}`);
      alert(`Successfully saved to your Documents folder as ${fileName}`);

    } catch (error) {
      console.error('Failed to export PDF:', error);
      setExportError(`PDF export failed: ${error.message}`); // Show error to the user
    } finally {
      // 6. Finish the process and hide the progress bar after a short delay
      setTimeout(() => {
        setIsExporting(false);
      }, 2000);
    }
  };

  /**
   * Placeholder function for starting a new document.
   * You would add your own logic here.
   */
  const handleNewDocument = () => {
    alert("Starting a new document!");
    // Here you would reset your app's state to the upload screen
  };


  // --- UI (YOUR EXISTING JSX, WHICH IS EXCELLENT) ---
  return (
    <div className="container mx-auto p-4 font-sans bg-gray-50 min-h-screen">
      
      <div className="text-center my-8">
        <h1 className="text-2xl font-bold">Translation Complete</h1>
        <p className="text-gray-600">Your document has been successfully translated with word-to-word mapping</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <Card>
          <CardHeader><CardTitle className="text-3xl font-bold text-blue-600">{resultData.originalPages}</CardTitle></CardHeader>
          <CardContent><p className="text-gray-500">Original Pages</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-3xl font-bold text-green-600">{resultData.translatedPages}</CardTitle></CardHeader>
          <CardContent><p className="text-gray-500">Translated Pages</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-3xl font-bold">{resultData.wordMappings}</CardTitle></CardHeader>
          <CardContent><p className="text-gray-500">Word Mappings</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-3xl font-bold text-orange-500">{resultData.preservedElements}</CardTitle></CardHeader>
          <CardContent><p className="text-gray-500">Preserved Elements</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 my-4">
         <Card>
          <CardHeader><CardTitle>Translation Confidence</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{resultData.confidence}%</p></CardContent>
        </Card>
         <Card>
          <CardHeader><CardTitle>Medical Terms</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{resultData.medicalTerms}</p></CardContent>
        </Card>
      </div>

      {/* --- EXPORT SECTION --- */}
      <div className="mt-8">
        {/* Progress Indicator */}
        {isExporting && (
          <div className="w-full p-4 text-center">
            <p className="mb-2">Generating PDF with layout preservation...</p>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Error Message Display */}
        {exportError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md my-4" role="alert">
            <p>{exportError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleExportClick}
            disabled={isExporting}
            size="lg"
            className="w-full"
          >
            {isExporting ? `Processing... ${Math.round(progress)}%` : 'Export PDF with Layout'}
          </Button>
          <Button
            onClick={handleNewDocument}
            disabled={isExporting}
            variant="outline"
            size="lg"
            className="w-full"
          >
            New Document
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;

