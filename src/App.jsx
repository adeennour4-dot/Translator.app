import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { Upload, FileText, Download, Languages, Eye, Palette, Zap, AlertCircle } from 'lucide-react'
import PDFViewer from './components/PDFViewer.jsx'
import PDFProcessor from './utils/pdfProcessor.js'
import TranslationService from './utils/translationService.js'
import PDFGenerator from './utils/pdfGenerator.js'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [processedData, setProcessedData] = useState(null)
  const [extractedPages, setExtractedPages] = useState([])
  const [translatedPages, setTranslatedPages] = useState([])
  const [useOCR, setUseOCR] = useState(false)
  const [isScannedPDF, setIsScannedPDF] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const pdfProcessor = useRef(new PDFProcessor())
  const translationService = useRef(new TranslationService())
  const pdfGenerator = useRef(new PDFGenerator())

  useEffect(() => {
    return () => {
      // Cleanup OCR worker on unmount
      pdfProcessor.current.cleanup()
    }
  }, [])

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError(null)
      setActiveTab('preview')
      
      // Check if PDF is scanned
      try {
        const isScanned = await pdfProcessor.current.isScannedPDF(file)
        setIsScannedPDF(isScanned)
        setUseOCR(isScanned)
      } catch (error) {
        console.error('Error checking PDF type:', error)
        setIsScannedPDF(false)
        setUseOCR(false)
      }
    } else {
      setError('Please select a PDF file')
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError(null)
      setActiveTab('preview')
      
      // Check if PDF is scanned
      try {
        const isScanned = await pdfProcessor.current.isScannedPDF(file)
        setIsScannedPDF(isScanned)
        setUseOCR(isScanned)
      } catch (error) {
        console.error('Error checking PDF type:', error)
        setIsScannedPDF(false)
        setUseOCR(false)
      }
    } else {
      setError('Please drop a PDF file')
    }
  }

  const startTranslation = async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    setProgress(0)
    setProgressMessage('Starting translation...')
    setActiveTab('processing')
    setError(null)
    
    try {
      // Step 1: Extract text from PDF
      const onProgress = (progress, message) => {
        setProgress(Math.min(progress * 0.5, 50)) // First 50% for extraction
        setProgressMessage(message)
      }
      
      let pages
      if (useOCR) {
        pages = await pdfProcessor.current.extractTextWithOCR(selectedFile, onProgress)
      } else {
        pages = await pdfProcessor.current.extractTextFromPDF(selectedFile, onProgress)
      }
      
      setExtractedPages(pages)
      
      // Step 2: Translate the extracted text
      setProgressMessage('Starting translation...')
      const translationProgress = (progress, message) => {
        setProgress(50 + (progress * 0.4)) // Next 40% for translation
        setProgressMessage(message)
      }
      
      const translated = await translationService.current.translatePages(pages, translationProgress)
      setTranslatedPages(translated)
      
      // Step 3: Generate statistics
      setProgressMessage('Generating statistics...')
      setProgress(95)
      
      const stats = await translationService.current.getTranslationStats(translated)
      const wordMappings = translationService.current.exportWordMappings(translated)
      
      setProcessedData({
        originalPages: pages.length,
        translatedPages: translated.length,
        wordMappings: wordMappings.length,
        preservedElements: pages.reduce((acc, page) => acc + page.textItems.length, 0),
        confidence: Math.round(stats.confidence * 100),
        medicalTerms: stats.medicalTerms
      })
      
      setProgress(100)
      setProgressMessage('Translation complete!')
      setActiveTab('results')
      
    } catch (error) {
      console.error('Translation error:', error)
      setError(`Translation failed: ${error.message}`)
      setProgress(0)
      setProgressMessage('')
    } finally {
      setIsProcessing(false)
    }
  }

  const exportPDF = async () => {
    if (!selectedFile || !extractedPages.length || !translatedPages.length) {
      setError('No translation data available for export')
      return
    }

    try {
      setIsProcessing(true)
      setProgressMessage('Generating PDF with layout preservation...')
      setProgress(0)

      // Generate the PDF with the specified layout
      const pdfBytes = await pdfGenerator.current.generateTranslationPDF(
        selectedFile,
        extractedPages,
        translatedPages
      )

      setProgress(90)
      setProgressMessage('Preparing download...')

      // Download the generated PDF
      const filename = `translation-${selectedFile.name.replace('.pdf', '')}-${new Date().toISOString().slice(0, 10)}.pdf`
      await pdfGenerator.current.downloadPDF(pdfBytes, filename)

      setProgress(100)
      setProgressMessage('PDF exported successfully!')
      
      // Reset progress after a short delay
      setTimeout(() => {
        setProgress(0)
        setProgressMessage('')
      }, 2000)

    } catch (error) {
      console.error('PDF export error:', error)
      setError(`PDF export failed: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
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
              <Zap className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
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

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {error && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors">
              <CardContent className="p-12">
                <div
                  className="text-center cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload PDF Document</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                  <Button variant="outline" className="mb-4">
                    Choose File
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF files up to 50MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5 text-purple-600" />
                    <span>Layout Preservation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Maintains original text layout, colors, and formatting in translated documents
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Smart Export</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generates PDFs with original, translation, and word-to-word mapping pages
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    <span>Mobile Ready</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Optimized for mobile devices and ready for APK conversion
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
                <CardDescription>
                  {selectedFile ? `File: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'No file selected'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedFile ? (
                  <div className="space-y-4">
                    {/* OCR Controls */}
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">OCR Processing</div>
                            <div className="text-sm text-muted-foreground">
                              {isScannedPDF 
                                ? 'Scanned document detected - OCR recommended' 
                                : 'Text-based document - OCR optional'}
                            </div>
                          </div>
                          <Switch
                            checked={useOCR}
                            onCheckedChange={setUseOCR}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* PDF Viewer */}
                    <PDFViewer 
                      file={selectedFile} 
                      className="w-full"
                    />
                    
                    <div className="flex justify-center">
                      <Button 
                        onClick={startTranslation} 
                        size="lg" 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        disabled={isProcessing}
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing...' : 'Start Translation'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Please upload a PDF file first</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Translation in Progress</CardTitle>
                <CardDescription>Processing your document with advanced AI translation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progressMessage || 'Processing...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                {isProcessing && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-muted-foreground">
                      {useOCR ? 'Running OCR analysis...' : 'Extracting text...'}
                    </span>
                  </div>
                )}

                {error && (
                  <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Translation Complete</CardTitle>
                <CardDescription>Your document has been successfully translated with word-to-word mapping</CardDescription>
              </CardHeader>
              <CardContent>
                {processedData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{processedData.originalPages}</div>
                        <div className="text-sm text-muted-foreground">Original Pages</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{processedData.translatedPages}</div>
                        <div className="text-sm text-muted-foreground">Translated Pages</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{processedData.wordMappings}</div>
                        <div className="text-sm text-muted-foreground">Word Mappings</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{processedData.preservedElements}</div>
                        <div className="text-sm text-muted-foreground">Preserved Elements</div>
                      </div>
                    </div>

                    {/* Additional Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">Translation Confidence</div>
                              <div className="text-2xl font-bold">{processedData.confidence}%</div>
                            </div>
                            <div className="text-blue-600">
                              <Languages className="h-8 w-8" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">Medical Terms</div>
                              <div className="text-2xl font-bold">{processedData.medicalTerms}</div>
                            </div>
                            <div className="text-green-600">
                              <Palette className="h-8 w-8" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button onClick={exportPDF} size="lg" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF with Layout
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setSelectedFile(null)
                        setProcessedData(null)
                        setExtractedPages([])
                        setTranslatedPages([])
                        setActiveTab('upload')
                      }}>
                        New Document
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

