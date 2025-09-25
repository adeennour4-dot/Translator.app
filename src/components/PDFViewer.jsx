import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

// More reliable way to set up the PDF.js worker for Vite/modern bundlers
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

const PDFViewer = ({ file, className = '' }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPageNumber(1);
    setError(null);
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF document. The file may be corrupted or unsupported.');
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  if (!file) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {pageNumber} of {numPages || '?'}</span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= (numPages || 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
          </div>
        </div>

        {error ? (
           <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="flex justify-center overflow-auto max-h-96 border rounded-lg bg-gray-100">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="p-8">Loading PDF Preview...</div>}
            >
              <Page pageNumber={pageNumber} scale={scale} />
            </Document>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFViewer;
