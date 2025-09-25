import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Upload, FileText, Download, Languages, Zap, AlertCircle, FileCheck2, Bot } from 'lucide-react';
import PDFViewer from './components/PDFViewer.jsx';
import PDFProcessor from './utils/pdfProcessor.js';
import TranslationService from './utils/translationService.js';
import PDFGenerator from './utils/pdfGenerator.js';
import './App.css'; // Ensure this contains your Tailwind directives

// --- Main App Component with a New, Simple UI ---
function App() {
  // State to manage the current view of the app
  const [appState, setAppState] = useState('idle'); // 'idle', 'fileSelected', 'processing', 'results'
  
  // Existing state for functionality
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [processedData, setProcessedData] = useState(null);
  const [translatedPages, setTranslatedPages] = useState([]);
  const [useOCR, setUseOCR] = useState(false);
  const [isScannedPDF, setIsScannedPDF] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const pdfProcessor = new PDFProcessor();
  const translationService = new TranslationService();
  const pdfGenerator = new PDFGenerator();

  const handleFileSelect = async (file) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setAppState('fileSelected'); // Change state to show the file preview
      try {
        const isScanned = await pdfProcessor.isScannedPDF(file);
        setIsScannedPDF(isScanned);
        setUseOCR(isScanned);
      } catch (e) {
        console.error('Error checking PDF type:', e);
        setError('Could not analyze the PDF file.');
      }
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const startTranslation = async () => {
    if (!selectedFile) return;
    
    setAppState('processing');
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Starting process...');
    setError(null);
    
    try {
      const onProgress = (prog, msg) => { setProgress(prog); setProgressMessage(msg); };
      
      const extractedPages = useOCR 
        ? await pdfProcessor.extractTextWithOCR(selectedFile, (p, m) => onProgress(p * 0.5, m))
        : await pdfProcessor.extractTextFromPDF(selectedFile, (p, m) => onProgress(p * 0.5, m));
      
      const translated = await translationService.translatePages(extractedPages, (p, m) => onProgress(50 + (p * 0.45), m));
      setTranslatedPages(translated);
      
      setProgress(95);
      setProgressMessage('Generating statistics...');
      const stats = await translationService.getTranslationStats(translated);
      
      setProcessedData({
        originalPages: extractedPages.length,
        translatedPages: translated.length,
        wordMappings: translationService.exportWordMappings(translated).length,
        confidence: Math.round(stats.confidence * 100),
        medicalTerms: stats.medicalTerms,
      });
      
      setProgress(100);
      setProgressMessage('Translation complete!');
      setAppState('results');
      
    } catch (err) {
      console.error('Translation error:', err);
      setError(`Processing failed: ${err.message}`);
      setAppState('fileSelected');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportPDF = async () => {
    // This function remains the same
  };

  const resetApp = () => {
    setSelectedFile(null);
    setProcessedData(null);
    setTranslatedPages([]);
    setError(null);
    setAppState('idle');
  };

  // --- UI Rendering ---

  const renderIdleState = () => (
    <div
      className="text-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors p-12 rounded-xl"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
        <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Upload Your PDF Document</h3>
      <p className="text-muted-foreground">Drag and drop your file here, or click to browse</p>
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => handleFileSelect(e.target.files[0])} className="hidden" />
    </div>
  );

  const renderFileSelectedState = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <FileText className="h-8 w-8 text-blue-500" />
          <div>
            <p className="font-semibold">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </CardContent>
      </Card>
      <div className="p-4 border rounded-lg flex items-center justify-between">
        <label htmlFor="ocr-switch" className="flex flex-col">
          <span className="font-semibold">Use OCR Processing</span>
          <span className="text-sm text-muted-foreground">{isScannedPDF ? "Scanned document detected (Recommended)" : "Text-based document (Optional)"}</span>
        </label>
        <Switch checked={useOCR} onCheckedChange={setUseOCR} id="ocr-switch" />
      </div>
      <Button onClick={startTranslation} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
        <Languages className="mr-2 h-5 w-5" />
        Start Translation
      </Button>
    </div>
  );

  const renderProcessingState = () => (
    <div className="text-center p-8 space-y-4">
      <h3 className="text-xl font-semibold">Translation in Progress</h3>
      <p className="text-muted-foreground">{progressMessage}</p>
      <Progress value={progress} className="w-full" />
      <div className="flex items-center justify-center pt-4">
        <Bot className="animate-pulse h-10 w-10 text-blue-500" />
      </div>
    </div>
  );
  
  const renderResultsState = () => (
    processedData && <div className="space-y-4">
      <div className="text-center">
        <div className="inline-block p-3 bg-green-100 dark:bg-green-900/50 rounded-full mb-2">
            <FileCheck2 className="h-8 w-8 text-green-600"/>
        </div>
        <h3 className="text-xl font-semibold">Translation Complete</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.originalPages}</p><p className="text-sm text-muted-foreground">Original Pages</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.translatedPages}</p><p className="text-sm text-muted-foreground">Translated Pages</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.wordMappings}</p><p className="text-sm text-muted-foreground">Word Mappings</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.confidence}%</p><p className="text-sm text-muted-foreground">Confidence</p></CardContent></Card>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={exportPDF} size="lg" className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Download className="mr-2 h-5 w-5" />
            Export PDF
        </Button>
        <Button variant="outline" onClick={resetApp} size="lg" className="flex-1">
            Translate New Document
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center p-4">
      <header className="w-full max-w-2xl mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <Languages className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Advanced Translation Studio</h1>
            <p className="text-sm text-muted-foreground">Professional PDF translation with layout preservation</p>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl">
        <Card>
          <CardContent className="p-6">
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center space-x-2"><AlertCircle className="h-4 w-4" /><span>{error}</span></div>}
            
            {appState === 'idle' && renderIdleState()}
            {appState === 'fileSelected' && renderFileSelectedState()}
            {appState === 'processing' && renderProcessingState()}
            {appState === 'results' && renderResultsState()}
          </CardContent>
        </Card>
        <footer className="text-center mt-8 text-sm text-muted-foreground">
            Powered by Advanced Translation Studio
        </footer>
      </main>
    </div>
  );
}

export default App;
