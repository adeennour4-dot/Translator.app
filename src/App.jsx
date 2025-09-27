import { useState, useRef, useEffect } from 'react';
import { Button } from './components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card.jsx';
import { Progress } from './components/ui/progress.jsx';
import { Badge } from './components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.jsx';
import { Switch } from './components/ui/switch.jsx';
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
    return () => { 
      if (pdfProcessor.cleanup) {
        pdfProcessor.cleanup(); 
      }
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
      
      const pages = useOCR 
        ? await pdfProcessor.extractTextWithOCR(selectedFile, (p, m) => onProgress(p * 0.5, m))
        : await pdfProcessor.extractTextFromPDF(selectedFile, (p, m) => onProgress(p * 0.5, m));
      
      setExtractedPages(pages);
      const translated = await translationService.translatePages(pages, (p, m) => onProgress(50 + (p * 0.45), m));
      setTranslatedPages(translated);
      setProgress(95);
      setProgressMessage('Generating statistics...');
      
      const stats = translationService.getTranslationStats ? await translationService.getTranslationStats(translated) : { confidence: 0.95, medicalTerms: 0 };
      const wordMappings = translationService.exportWordMappings ? translationService.exportWordMappings(translated) : [];
      
      setProcessedData({
        originalPages: pages.length,
        translatedPages: translated.length,
        wordMappings: wordMappings.length,
        preservedElements: pages.reduce((acc, page) => acc + (page.textItems ? page.textItems.length : 0), 0),
        confidence: Math.round(stats.confidence * 100),
        medicalTerms: stats.medicalTerms || 0
      });
      
      setProgress(100);
      setProgressMessage('Translation complete!');
      setActiveTab('results');
    } catch (err) {
      console.error('Translation error:', err);
      setError(`Processing failed: ${err.message}`);
      setActiveTab('preview');
    } finally { 
      setIsProcessing(false); 
    }
  };

  const exportPDF = async () => {
    if (!selectedFile || !translatedPages.length) {
      setError('No data to export.');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Generating final PDF...');
    setActiveTab('processing');
    setError(null);
    
    try {
      const pdfBytes = await pdfGenerator.generateTranslationPDF(selectedFile, extractedPages, translatedPages);
      setProgress(90);
      const filename = `translated-${selectedFile.name}`;
      
      if (pdfGenerator.downloadPDF) {
        await pdfGenerator.downloadPDF(pdfBytes, filename);
      } else {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      setProgress(100);
      setProgressMessage('PDF exported successfully!');
      setTimeout(() => { 
        setProgressMessage(''); 
        setActiveTab('results'); 
      }, 2000);
    } catch (err) {
      console.error('PDF export error:', err);
      setError(`PDF export failed: ${err.message}`);
      setActiveTab('results');
    } finally { 
      setIsProcessing(false); 
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setProcessedData(null);
    setExtractedPages([]);
    setTranslatedPages([]);
    setError(null);
    setActiveTab('upload');
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
                <p className="text-sm text-muted-foreground">
                  Professional PDF translation with layout preservation
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <Zap className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedFile} className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </TabsTrigger>
            <TabsTrigger value="processing" disabled={!isProcessing && !processedData} className="flex items-center space-x-2">
              <Languages className="h-4 w-4" />
              <span>Processing</span>
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!processedData} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Results</span>
            </TabsTrigger>
          </TabsList>

          {error && (
            <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <TabsContent value="upload">
            <Card className="border-2 border-dashed" onDragOver={handleDragOver} onDrop={handleDrop}>
              <CardContent 
                className="p-12 text-center cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload PDF Document</h3>
                <p className="text-muted-foreground">Drag and drop your file here, or click to browse</p>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
                <CardDescription>
                  {selectedFile ? `File: ${selectedFile.name}` : 'No file selected'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedFile && (
                  <div className="space-y-4">
                    <Card className="bg-blue-50 dark:bg-blue-900/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">OCR Processing</div>
                            <div className="text-sm text-muted-foreground">
                              {isScannedPDF ? 'Scanned document detected - OCR recommended' : 'Text-based document - OCR optional'}
                            </div>
                          </div>
                          <Switch checked={useOCR} onCheckedChange={setUseOCR} />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="border rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                      <p className="text-muted-foreground">PDF Preview would appear here</p>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button onClick={startTranslation} size="lg" disabled={isProcessing}>
                        <Languages className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing...' : 'Start Translation'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing">
            <Card>
              <CardHeader>
                <CardTitle>Translation in Progress</CardTitle>
                <CardDescription>Processing your document...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex justify-between text-sm">
                  <span>{progressMessage}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            {processedData && (
              <Card>
                <CardHeader>
                  <CardTitle>Translation Complete</CardTitle>
                  <CardDescription>Your document has been successfully translated.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{processedData.originalPages}</div>
                        <div className="text-sm text-muted-foreground">Original Pages</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{processedData.translatedPages}</div>
                        <div className="text-sm text-muted-foreground">Translated Pages</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{processedData.wordMappings}</div>
                        <div className="text-sm text-muted-foreground">Word Mappings</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{processedData.confidence}%</div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex justify-center space-x-4 pt-4">
                    <Button onClick={exportPDF} size="lg" disabled={isProcessing}>
                      <Download className="h-4 w-4 mr-2" />
                      {isProcessing ? 'Exporting...' : 'Export PDF with Layout'}
                    </Button>
                    <Button variant="outline" onClick={resetApp}>
                      New Document
                    </Button>
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
