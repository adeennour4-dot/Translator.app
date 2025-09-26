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

  const startTranslation = async () => { /* ... (Your full startTranslation logic) ... */ };
  const exportPDF = async () => { /* ... (Your full exportPDF logic) ... */ };
  const resetApp = () => {
    setSelectedFile(null);
    setProcessedData(null);
    setActiveTab('upload');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
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
          <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Ready</Badge>
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
          
          {error && <Card className="mb-4 bg-red-50 border-red-200"><CardContent className="p-4 flex items-center text-red-700 space-x-2"><AlertCircle className="h-4 w-4" /><span className="text-sm">{error}</span></CardContent></Card>}

          <TabsContent value="upload">
            <Card className="border-2 border-dashed" onDragOver={handleDragOver} onDrop={handleDrop}>
              <CardContent className="p-12 text-center" onClick={() => fileInputRef.current?.click()}>
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4"><Upload className="h-8 w-8 text-blue-600" /></div>
                <h3 className="text-xl font-semibold mb-2">Upload PDF Document</h3>
                <p className="text-muted-foreground">Drag and drop your file here, or click to browse</p>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader><CardTitle>Document Preview</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <PDFViewer file={selectedFile} />
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <label htmlFor="ocr-switch" className="flex flex-col cursor-pointer"><span className="font-semibold">Use OCR Processing</span><span className="text-sm text-muted-foreground">{isScannedPDF ? "Scanned document (Recommended)" : "Text-based document (Optional)"}</span></label>
                  <Switch checked={useOCR} onCheckedChange={setUseOCR} id="ocr-switch" />
                </div>
                <div className="flex justify-center"><Button onClick={startTranslation} size="lg" disabled={isProcessing}><Languages className="mr-2 h-4 w-4" />{isProcessing ? 'Processing...' : 'Start Translation'}</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing">
            <Card>
              <CardHeader><CardTitle>Translation in Progress</CardTitle><CardDescription>Processing your document...</CardDescription></CardHeader>
              <CardContent className="p-6">
                <Progress value={progress} className="w-full mb-4" />
                <p className="text-center text-muted-foreground">{progressMessage}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            {processedData && <Card>
              <CardHeader><CardTitle>Translation Complete</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.originalPages}</p><p className="text-sm text-muted-foreground">Original Pages</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.translatedPages}</p><p className="text-sm text-muted-foreground">Translated Pages</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.wordMappings}</p><p className="text-sm text-muted-foreground">Word Mappings</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-2xl font-bold">{processedData.confidence}%</p><p className="text-sm text-muted-foreground">Confidence</p></CardContent></Card>
                </div>
                <div className="flex justify-center space-x-4 pt-4">
                  <Button onClick={exportPDF} size="lg" disabled={isProcessing}><Download className="mr-2 h-4 w-4" />{isProcessing ? 'Exporting...' : 'Export PDF'}</Button>
                  <Button variant="outline" onClick={resetApp} size="lg">New Document</Button>
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
