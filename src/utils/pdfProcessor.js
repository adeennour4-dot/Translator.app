import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export class PDFProcessor {
  constructor() {
    this.ocrWorker = null
  }

  async initializeOCR() {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('eng+ara')
    }
    return this.ocrWorker
  }

  async extractTextFromPDF(file, onProgress = () => {}) {
    try {
      onProgress(10, 'Loading PDF document...')
      
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
      
      const pages = []
      const totalPages = pdf.numPages
      
      onProgress(20, `Processing ${totalPages} pages...`)
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        onProgress(20 + (pageNum / totalPages) * 60, `Extracting text from page ${pageNum}...`)
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Extract text with position and style information
        const pageData = {
          pageNumber: pageNum,
          text: '',
          textItems: [],
          viewport: page.getViewport({ scale: 1.0 })
        }
        
        textContent.items.forEach((item, index) => {
          if (item.str.trim()) {
            pageData.text += item.str + ' '
            pageData.textItems.push({
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height,
              fontName: item.fontName,
              fontSize: item.transform[0],
              color: this.extractColor(item),
              index: index
            })
          }
        })
        
        pages.push(pageData)
      }
      
      onProgress(90, 'Finalizing text extraction...')
      return pages
      
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      throw new Error(`Failed to extract text: ${error.message}`)
    }
  }

  async extractTextWithOCR(file, onProgress = () => {}) {
    try {
      onProgress(10, 'Initializing OCR engine...')
      await this.initializeOCR()
      
      onProgress(20, 'Converting PDF to images...')
      const images = await this.convertPDFToImages(file)
      
      const pages = []
      const totalPages = images.length
      
      for (let i = 0; i < totalPages; i++) {
        onProgress(20 + (i / totalPages) * 60, `OCR processing page ${i + 1}...`)
        
        const { data: { text, words } } = await this.ocrWorker.recognize(images[i])
        
        const pageData = {
          pageNumber: i + 1,
          text: text.trim(),
          textItems: words.map((word, index) => ({
            text: word.text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            confidence: word.confidence,
            index: index
          })),
          viewport: { width: images[i].width, height: images[i].height }
        }
        
        pages.push(pageData)
      }
      
      onProgress(90, 'Finalizing OCR processing...')
      return pages
      
    } catch (error) {
      console.error('Error with OCR processing:', error)
      throw new Error(`OCR processing failed: ${error.message}`)
    }
  }

  async convertPDFToImages(file) {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
    const images = []
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })
      
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise
      
      images.push(canvas)
    }
    
    return images
  }

  extractColor(textItem) {
    // Default to black if no color information
    return textItem.color || '#000000'
  }

  async isScannedPDF(file) {
    try {
      const pages = await this.extractTextFromPDF(file)
      const totalText = pages.reduce((acc, page) => acc + page.text.length, 0)
      
      // If very little text is extracted, it's likely a scanned PDF
      return totalText < 100
    } catch (error) {
      return true // Assume scanned if extraction fails
    }
  }

  async cleanup() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate()
      this.ocrWorker = null
    }
  }
}

export default PDFProcessor

