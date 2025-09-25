import { useState, useRef } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Upload, FileText, Download, Languages, Eye, Zap, AlertCircle } from 'lucide-react';
import PDFViewer from './components/PDFViewer.jsx';
import PDFProcessor from './utils/pdfProcessor.js';
import TranslationService from './utils/translationService.js';
import PDFGenerator from './utils/pdfGenerator.js';
import './App.css';

// --- FIX: Helper function to correctly convert a Blob to a Base64 data URL for Capacitor --- 
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

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

  // --- FIX: Complete rewrite of the export function for Capacitor --- 
  const exportPDF = async () => {
    if (!selectedFile || !translatedPages.length) {
      setError('No data to export.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Generating final PDF...');
    setError(null);

    try {
      // 1. Get the PDF as a Uint8Array from your generator
      const pdfBytes = await pdfGenerator.generateTranslatedPDF(
        selectedFile,
        translatedPages,
        (p, m) => {
          setProgress(p);
          setProgressMessage(m);
        }
      );

      // 2. Convert the Uint8Array to a Blob
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      // 3. Convert Blob to Base64 Data URL using the helper function
      const base64data = await blobToBase64(pdfBlob);

      // 4. Save the file to the device's Documents directory
      const fileName = `translated_${Date.now()}.pdf`;
      await Filesystem.writeFile({
        path: fileName,
        data: base64data,
        directory: Directory.Documents,
      });

      setProgress(100);
      setProgressMessage(`PDF exported successfully! Saved in Documents as ${fileName}`);

    } catch (err) {
      console.error('Export error:', err);
      setError(`Export failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-gray-800 border-gray-700 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-blue-400">AI Document Translator</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">
              <Languages className="h-4 w-4 mr-1" />
              Multi-Language
            </Badge>
            <Badge variant="secondary" className="bg-purple-500 hover:bg-purple-600 text-white">
              <Zap className="h-4 w-4 mr-1" />
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!selectedFile}>
                <Eye className="h-4 w-4 mr-2" /> Preview
              </TabsTrigger>
              <TabsTrigger value="processing" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!selectedFile || activeTab === 'upload'}>
                 <Zap className="h-4 w-4 mr-2" /> Processing
              </TabsTrigger>
              <TabsTrigger value="results" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!processedData}>
                <FileText className="h-4 w-4 mr-2" /> Results
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg text-gray-300 mb-2">Drag & drop your PDF here, or</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="application/pdf"
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current.click()} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Browse Files
                </Button>
                {error && (
                  <p className="text-red-500 mt-4 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" /> {error}
                  </p>
                )}
              </div>
              <div className="mt-6 p-4 bg-gray-700 rounded-lg flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-gray-300">Use OCR for scanned or image-based PDFs</span>
                    <small className="text-gray-400">Provides more accurate text extraction but is slower.</small>
                </div>
                <Switch checked={useOCR} onCheckedChange={setUseOCR} />
              </div>
              {isScannedPDF && !useOCR && (
                <p className="text-yellow-500 mt-2 flex items-center p-2 bg-yellow-900/20 rounded-md">
                  <AlertCircle className="h-4 w-4 mr-2" /> This appears to be a scanned PDF. Consider enabling OCR for better results.
                </p>
              )}
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <p className="text-lg text-gray-300 mb-4">Previewing: <span className="font-semibold">{selectedFile.name}</span></p>
                  <PDFViewer file={selectedFile} className="w-full" />
                  <Button onClick={startTranslation} disabled={isProcessing} className="mt-6 bg-green-500 hover:bg-green-600 text-white w-full md:w-auto">
                    {isProcessing ? 'Translating...' : 'Start Translation'}
                  </Button>
                </div>
              ) : (
                <p className="text-gray-400 text-center p-8">No file selected for preview.</p>
              )}
            </TabsContent>
            <TabsContent value="processing" className="mt-4">
              <div className="flex flex-col items-center justify-center p-8">
                <h3 className="text-xl font-semibold mb-4">Translation in Progress</h3>
                <Progress value={progress} className="w-full mb-4" />
                <p className="text-gray-300 text-center">{progressMessage}</p>
                {error && (
                  <p className="text-red-500 mt-4 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" /> {error}
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="results" className="mt-4">
              {processedData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-blue-300">Translation Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>Original Pages: <span className="font-semibold float-right">{processedData.originalPages}</span></p>
                      <p>Translated Pages: <span className="font-semibold float-right">{processedData.translatedPages}</span></p>
                      <p>Word Mappings: <span className="font-semibold float-right">{processedData.wordMappings}</span></p>
                      <p>Preserved Elements: <span className="font-semibold float-right">{processedData.preservedElements}</span></p>
                      <div>Confidence Score:
                        <div className="w-24 float-right">
                            <Progress value={processedData.confidence} className="h-3" />
                        </div>
                      </div>
                      <p className="pt-2">Medical Terms Detected: <span className="font-semibold float-right">{processedData.medicalTerms}</span></p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-700 border-gray-600 flex flex-col justify-between">
                    <CardHeader>
                      <CardTitle className="text-blue-300">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={exportPDF} disabled={isProcessing} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                        <Download className="h-4 w-4 mr-2" /> {isProcessing ? 'Exporting...' : 'Export Translated PDF'}
                      </Button>
                      <Button onClick={() => { setSelectedFile(null); setProcessedData(null); setActiveTab('upload'); }} variant="outline" className="w-full border-gray-500 text-gray-300 hover:bg-gray-600">
                        Translate Another Document
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-gray-400 text-center p-8">No results to display. Please translate a document first.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <footer className="text-center mt-4">
        <p className="text-xs text-gray-500">Powered by Advanced Translation Studio</p>
      </footer>
    </div>
  );
}

export default App;
