import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const PDFViewer = ({ file, onLoadSuccess, className = '' }) => {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [error, setError] = useState(null)

  useEffect(() => {
    setPageNumber(1)
    setError(null)
  }, [file])

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setError(null)
    if (onLoadSuccess) {
      onLoadSuccess({ numPages })
    }
  }

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF document')
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1))
  }

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-2">Error</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!file) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">No PDF file selected</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= (numPages || 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Document */}
        <div className="flex justify-center overflow-auto max-h-96 border rounded-lg">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3">Loading PDF...</span>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              loading={
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              }
            />
          </Document>
        </div>
      </CardContent>
    </Card>
  )
}

export default PDFViewer

