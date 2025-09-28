import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Disable worker entirely to bypass the loading issue
pdfjs.GlobalWorkerOptions.workerSrc = '';
pdfjs.disableWorker = true;

const PDFViewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error) {
    setError(error.message);
  }

  if (error) {
    return <div className="text-red-500">PDF Error: {error}</div>;
  }

  return (
    <div>
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading="Loading PDF..."
        error="Failed to load PDF"
      >
        <Page pageNumber={pageNumber} />
      </Document>
      
      {numPages && (
        <div className="flex justify-center gap-4 mt-4">
          <button 
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="py-2">Page {pageNumber} of {numPages}</span>
          <button 
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
