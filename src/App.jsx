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

  const startTranslation = async () => { /* ... Your startTranslation logic ... */ };
  const exportPDF = async () => { /* ... Your exportPDF logic ... */ };

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

          <TabsContent value="upload">
             {/* --- This is where your full UI for the Upload tab goes --- */}
             <Card>
                <CardHeader><CardTitle>Upload a Document</CardTitle></CardHeader>
                <CardContent>Click here to select a file.</CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader><CardTitle>Document Preview</CardTitle><CardDescription>{selectedFile ? `File: ${selectedFile.name}` : 'No file selected'}</CardDescription></CardHeader>
              <CardContent>
                {selectedFile && <div className="space-y-4">
                  <Card className="bg-blue-50 dark:bg-blue-900/20"><CardContent className="p-4"><div className="flex items-center justify-between"><div className="space-y-1"><div className="font-medium">OCR Processing</div><div className="text-sm text-muted-foreground">{isScannedPDF ? 'Scanned document detected' : 'Text-based document'}</div></div><Switch checked={useOCR} onCheckedChange={setUseOCR} /></div></CardContent></Card>
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
                  {/* Your stats cards for results go here */}
                </div>
                <div className="flex justify-center space-x-4">
                  <Button onClick={exportPDF} size="lg"><Download className="h-4 w-4 mr-2" />Export PDF with Layout</Button>
                  <Button variant="outline" onClick={() => { setActiveTab('upload'); setProcessedData(null); setSelectedFile(null); }}>New Document</Button>
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
