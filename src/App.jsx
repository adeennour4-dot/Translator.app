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
  const [extractedPages, setExtractedPages] = useState([]);
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
    return () => { pdfProcessor.cleanup(); };
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
      } catch (e) { console.error('Error checking PDF type:', e); setError('Could not analyze the PDF file.'); }
    } else { setError('Please select a PDF file.'); }
  };
  
  const handleDragOver = (event) => event.preventDefault();
  const handleDrop = (event) => {
    event.preventDefault();
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
      const onProgress = (prog, msg) => { setProgress(prog); setProgressMessage(msg); };
      const pages = useOCR 
        ? await pdfProcessor.extractTextWithOCR(selectedFile, (p, m) => onProgress(p * 0.5, m))
        : await pdfProcessor.extractTextFromPDF(selectedFile, (p, m) => onProgress(p * 0.5, m));
      setExtractedPages(pages);
      const translated = await translationService.translatePages(pages, (p, m) => onProgress(50 + (p * 0.45), m));
      setTranslatedPages(translated);
      setProgress(95);
      setProgressMessage('Generating statistics...');
      const stats = await translationService.getTranslationStats(translated);
      const wordMappings = translationService.exportWordMappings(translated);
      setProcessedData({
        originalPages: pages.length,
        translatedPages: translated.length,
        wordMappings: wordMappings.length,
        preservedElements: pages.reduce((acc, page) => acc + page.textItems.length, 0),
        confidence: Math.round(stats.confidence * 100),
        medicalTerms: stats.medicalTerms
      });
      setProgress(100);
      setProgressMessage('Translation complete!');
      setActiveTab('results');
    } catch (err) {
      console.error('Translation error:', err);
      setError(`Processing failed: ${err.message}`);
      setActiveTab('preview');
    } finally { setIsProcessing(false); }
  };

  const exportPDF = async () => {
    if (!selectedFile || !translatedPages.length) return setError('No data to export.');
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Generating final PDF...');
    setActiveTab('processing');
    setError(null);
    try {
      const pdfBytes = await pdfGenerator.generateTranslationPDF(selectedFile, extractedPages, translatedPages);
      setProgress(90);
      const filename = `translated-${selectedFile.name}`;
      await pdfGenerator.downloadPDF(pdfBytes, filename);
      setProgress(100);
      setProgressMessage('PDF exported successfully!');
      setTimeout(() => { setProgressMessage(''); setActiveTab('results'); }, 2000);
    } catch (err) {
      console.error('PDF export error:', err);
      setError(`PDF export failed: ${err.message}`);
      setActiveTab('results');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Languages className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Advanced Translation Studio
                </h1>
                <p className="text-sm text-muted-foreground">Professional PDF translation with layout preservation</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <Zap className="h-3 w-3 mr-1" />Ready
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="upload" className="flex items-center space-x-2"><Upload className="h-4 w-4" /><span>Upload</span></TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedFile} className="flex items-center space-x-2"><Eye className="h-4 w-4" /><span>Preview</span></TabsTrigger>
            <TabsTrigger value="processing" disabled={!isProcessing && !processedData} className="flex items-center space-x-2"><Languages className="h-4 w-4" /><span>Processing</span></TabsTrigger>
            <TabsTrigger value="results" disabled={!processedData} className="flex items-center space-x-2"><Download className="h-4 w-4" /><span>Results</span></TabsTrigger>
          </TabsList>
          
          {error && <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"><CardContent className="p-4"><div className="flex items-center space-x-2 text-red-600 dark:text-red-400"><AlertCircle className="h-4 w-4" /><span className="text-sm">{error}</span></div></CardContent></Card>}

          <TabsContent value="upload">{/* Your Upload UI from the original file */}</TabsContent>
          <TabsContent value="preview">
            <Card>
              <CardHeader><CardTitle>Document Preview</CardTitle><CardDescription>{selectedFile ? `File: ${selectedFile.name}` : 'No file selected'}</CardDescription></CardHeader>
              <CardContent>
                {selectedFile && <div className="space-y-4">
                  <Card className="bg-blue-50 dark:bg-blue-900/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div className="space-y-1"><div className="font-medium">OCR Processing</div><div className="text-sm text-muted-foreground">{isScannedPDF ? 'Scanned document detected - OCR recommended' : 'Text-based document - OCR optional'}</div></div><Switch checked={useOCR} onCheckedChange={setUseOCR} /></div></CardContent></Card>
                  <PDFViewer file={selectedFile} className="w-full" />
                  <div className="flex justify-center"><Button onClick={startTranslation} size="lg" disabled={isProcessing}><Languages className="h-4 w-4 mr-2" />{isProcessing ? 'Processing...' : 'Start Translation'}</Button></div>
                </div>}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="processing">
            <Card>
              <CardHeader><CardTitle>Translation in Progress</CardTitle><CardDescription>Processing your document...</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between text-sm"><span>{progressMessage}</span><span>{Math.round(progress)}%</span></div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="results">
             {processedData && <Card>
              <CardHeader><CardTitle>Translation Complete</CardTitle><CardDescription>Your document has been successfully translated.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Stats Cards */}
                </div>
                <div className="flex justify-center space-x-4">
                  <Button onClick={exportPDF} size="lg"><Download className="h-4 w-4 mr-2" />Export PDF with Layout</Button>
                  <Button variant="outline" onClick={() => setActiveTab('upload')}>New Document</Button>
                </div>
              </CardContent>
            </Card>}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;

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
