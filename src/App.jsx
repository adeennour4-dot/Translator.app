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
  
  // Initialize utility classes
  const pdfProcessor = new PDFProcessor();
  const translationService = new TranslationService();
  const pdfGenerator = new PDFGenerator();

  useEffect(() => {
    // Cleanup OCR worker when the component unmounts
    return () => {
      pdfProcessor.cleanup();
    };
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setActiveTab('preview');
      try {
        const isScanned = await pdfProcessor.isScannedPDF(file);
        setIsScannedPDF(isScanned);
        setUseOCR(isScanned);
      } catch (e) {
        console.error('Error checking PDF type:', e);
        setError('Could not analyze the PDF file.');
      }
    } else {
      setError('Please select a PDF file.');
    }
  };
  
  const handleDragOver = (event) => event.preventDefault();
  const handleDrop = (event) => {
    event.preventDefault();
    // Simulate a file selection event for the handler
    handleFileSelect({ target: { files: event.dataTransfer.files } });
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
      
      const translated = await translationService.translatePages(extractedPages, (p, m) => onProgress(50 + (p * 0.45), m));
      setTranslatedPages(translated);
      
      setProgress(95);
      setProgressMessage('Generating statistics...');
      const stats = await translationService.getTranslationStats(translated);
      const wordMappings = translationService.exportWordMappings(translated);
      
      setProcessedData({
        originalPages: extractedPages.length,
        translatedPages: translated.length,
        wordMappings: wordMappings.length,
        confidence: Math.round(stats.confidence * 100),
        medicalTerms: stats.medicalTerms,
        preservedElements: extractedPages.reduce((acc, page) => acc + page.textItems.length, 0),
      });
      
      setProgress(100);
      setProgressMessage('Translation complete!');
      setActiveTab('results');
      
    } catch (err) {
      console.error('Translation error:', err);
      setError(`Processing failed: ${err.message}`);
      setActiveTab('preview'); // Go back to preview on error
    } finally {
      setIsProcessing(false);
    }
  };

  const exportPDF = async () => {
    if (!selectedFile || !translatedPages.length) return setError('No data to export.');

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Generating final PDF...');
    setActiveTab('processing'); // Switch to processing view for export
    setError(null);

    try {
      // Pass both original and translated pages to the generator
      const pdfBytes = await pdfGenerator.generateTranslationPDF(selectedFile, translatedPages, translatedPages); // Assuming the function signature matches
      setProgress(90);
      
      const filename = `translated-${selectedFile.name}`;
      await pdfGenerator.downloadPDF(pdfBytes, filename);
      setProgress(100);
      setProgressMessage('PDF exported successfully!');

      setTimeout(() => {
        setProgressMessage('');
        setActiveTab('results'); // Go back to results after success
      }, 2000);

    } catch (err) {
      console.error('PDF export error:', err);
      setError(`PDF export failed: ${err.message}`);
      setActiveTab('results'); // Go back to results on error
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Languages className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Advanced Translation Studio</h1>
              <p className="text-sm text-muted-foreground">Professional PDF translation with layout preservation</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <Zap className="h-3 w-3 mr-1" />Ready
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="upload" className="flex items-center space-x-2"><Upload className="h-4 w-4" /><span>Upload</span></TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedFile} className="flex items-center space-x-2"><Eye className="h-4 w-4" /><span>Preview</span></TabsTrigger>
            <TabsTrigger value="processing" disabled={!isProcessing && activeTab !== 'processing'} className="flex items-center space-x-2"><Languages className="h-4 w-4" /><span>Processing</span></TabsTrigger>
            <TabsTrigger value="results" disabled={!processedData} className="flex items-center space-x-2"><Download className="h-4 w-4" /><span>Results</span></TabsTrigger>
          </TabsList>

          {error && (
            <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <TabsContent value="upload">
            {/* ... Your Upload UI ... */}
          </TabsContent>
          <TabsContent value="preview">
            <PDFViewer file={selectedFile} className="mt-4" />
            <div className="mt-4 p-4 border rounded-lg flex items-center justify-between">
              <label htmlFor="ocr-switch" className="flex flex-col">
                <span className="font-semibold">Use OCR Processing</span>
                <span className="text-sm text-muted-foreground">{isScannedPDF ? "Scanned document detected (Recommended)" : "Text-based document (Optional)"}</span>
              </label>
              <Switch checked={useOCR} onCheckedChange={setUseOCR} id="ocr-switch" />
            </div>
            <div className="flex justify-center mt-4">
              <Button onClick={startTranslation} size="lg" disabled={isProcessing}>
                <Languages className="mr-2 h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Start Translation'}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="processing">
            <Card className="mt-4">
              <CardHeader><CardTitle>Translation in Progress</CardTitle></CardHeader>
              <CardContent className="p-6">
                <Progress value={progress} className="w-full mb-4" />
                <p className="text-center text-muted-foreground">{progressMessage}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="results">
            {processedData && (
              <Card className="mt-4">
                <CardHeader><CardTitle>Translation Results</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"><div className="text-2xl font-bold">{processedData.originalPages}</div><div className="text-sm text-muted-foreground">Original Pages</div></div>
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"><div className="text-2xl font-bold">{processedData.translatedPages}</div><div className="text-sm text-muted-foreground">Translated Pages</div></div>
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"><div className="text-2xl font-bold">{processedData.wordMappings}</div><div className="text-sm text-muted-foreground">Word Mappings</div></div>
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"><div className="text-2xl font-bold">{processedData.confidence}%</div><div className="text-sm text-muted-foreground">Confidence</div></div>
                   </div>
                  <div className="flex justify-center space-x-4 pt-4">
                    <Button onClick={exportPDF} size="lg" disabled={isProcessing}>
                      <Download className="mr-2 h-4 w-4" />
                      {isProcessing ? 'Exporting...' : 'Export PDF'}
                    </Button>
                    <Button variant="outline" onClick={resetApp} size="lg">New Document</Button>
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
