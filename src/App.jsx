import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Upload, FileText, Download, Languages, Eye, Palette, Zap, AlertCircle } from 'lucide-react';
import PDFViewer from './components/PDFViewer.jsx';
import PDFProcessor from './utils/pdfProcessor.js';
import TranslationService from './utils/translationService.js';
import PDFGenerator from './utils/pdfGenerator.js';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [processedData, setProcessedData] = useState(null);
  const [translatedPages, setTranslatedPages] = useState([]);
  const [useOCR, setUseOCR] = useState(false);
  const [isScannedPDF, setIsScannedPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Use instances of your utility classes
  const pdfProcessor = new PDFProcessor();
  const translationService = new TranslationService();
  const pdfGenerator = new PDFGenerator();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setActiveTab('preview');
      pdfProcessor.isScannedPDF(file).then(setIsScannedPDF);
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const startTranslation = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Starting process...');
    setActiveTab('processing');
    setError(null);
    
    try {
      const onProgress = (prog, msg) => {
        setProgress(prog);
        setProgressMessage(msg);
      };
      
      const extractedPages = useOCR 
        ? await pdfProcessor.extractTextWithOCR(selectedFile, (p, m) => onProgress(p * 0.5, m))
        : await pdfProcessor.extractTextFromPDF(selectedFile, (p, m) => onProgress(p * 0.5, m));
      
      const translated = await translationService.translatePages(extractedPages, (p, m) => onProgress(50 + (p * 0.5), m));
      setTranslatedPages(translated);
      
      const stats = await translationService.getTranslationStats(translated);
      const wordMappings = translationService.exportWordMappings(translated);
      
      setProcessedData({
        originalPages: extractedPages.length,
        translatedPages: translated.length,
        wordMappings: wordMappings.length,
        confidence: Math.round(stats.confidence * 100),
        medicalTerms: stats.medicalTerms,
        preservedElements: 0 // Placeholder
      });
      
      setProgress(100);
      setProgressMessage('Translation complete!');
      setActiveTab('results');
      
    } catch (err) {
      console.error('Translation error:', err);
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportPDF = async () => {
    if (!selectedFile || !translatedPages.length) return setError('No data to export.');

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Generating final PDF...');
    setError(null);

    try {
      const pdfBytes = await pdfGenerator.generateTranslationPDF(selectedFile, translatedPages);
      setProgress(90);
      
      const filename = `translated-${selectedFile.name}`;
      await pdfGenerator.downloadPDF(pdfBytes, filename);
      setProgress(100);
      setProgressMessage('PDF exported successfully!');

      setTimeout(() => setProgressMessage(''), 2000);

    } catch (err) {
      console.error('PDF export error:', err);
      setError(`PDF export failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setProcessedData(null);
    setTranslatedPages([]);
    setError(null);
    setActiveTab('upload');
  };

  // The rest of your JSX from your file remains largely the same.
  // This is a condensed version for brevity. You can use your full JSX.
  return (
     <div className="min-h-screen bg-gray-50">
        <header className="border-b p-4">
            <h1 className="text-2xl font-bold">Advanced Translation Studio</h1>
        </header>
        <main className="container mx-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="preview" disabled={!selectedFile}>Preview</TabsTrigger>
                    <TabsTrigger value="processing" disabled={!isProcessing && !processedData}>Processing</TabsTrigger>
                    <TabsTrigger value="results" disabled={!processedData}>Results</TabsTrigger>
                </TabsList>

                {error && <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

                <TabsContent value="upload">
                    <Card className="mt-4">
                        <CardHeader><CardTitle>Upload PDF</CardTitle></CardHeader>
                        <CardContent>
                            <input type="file" accept=".pdf" onChange={handleFileSelect} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preview">
                    <PDFViewer file={selectedFile} className="mt-4" />
                    <div className="mt-4 flex items-center space-x-2">
                        <Switch checked={useOCR} onCheckedChange={setUseOCR} id="ocr-switch" />
                        <label htmlFor="ocr-switch">Use OCR {isScannedPDF && "(Recommended)"}</label>
                    </div>
                    <Button onClick={startTranslation} className="mt-4" disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Start Translation'}
                    </Button>
                </TabsContent>

                <TabsContent value="processing">
                    <Card className="mt-4">
                        <CardHeader><CardTitle>Processing...</CardTitle></CardHeader>
                        <CardContent>
                            <Progress value={progress} className="w-full" />
                            <p className="text-center mt-2">{progressMessage}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="results">
                    {processedData && (
                        <Card className="mt-4">
                            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>Original Pages: {processedData.originalPages}</div>
                                <div>Translated Pages: {processedData.translatedPages}</div>
                                <div>Confidence: {processedData.confidence}%</div>
                                <div className="space-x-4">
                                    <Button onClick={exportPDF} disabled={isProcessing}>
                                        {isProcessing ? 'Exporting...' : 'Export PDF'}
                                    </Button>
                                    <Button variant="outline" onClick={resetApp}>New Document</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </main>
     </div>
  );
}

export default App;
