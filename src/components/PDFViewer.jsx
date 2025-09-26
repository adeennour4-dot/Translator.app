import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

// Use a local worker file for better reliability in mobile apps
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

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);
  const onDocumentLoadError = (error) => setError('Failed to load PDF. File may be corrupt or unsupported.');

  if (!file) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(p - 1, 1))} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {pageNumber} of {numPages || '?'}</span>
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(p + 1, numPages))} disabled={pageNumber >= numPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(s + 0.2, 3.0))}><ZoomIn className="h-4 w-4" /></Button>
          </div>
        </div>
        
        {error ? (
          <div className="text-center p-8 text-red-500">{error}</div>
        ) : (
          <div className="flex justify-center overflow-auto max-h-96 border rounded-lg bg-gray-100 dark:bg-gray-700">
            <Document file={file} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading={<div className="p-8">Loading Preview...</div>}>
              <Page pageNumber={pageNumber} scale={scale} />
            </Document>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFViewer;
