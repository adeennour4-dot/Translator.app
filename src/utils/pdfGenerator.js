import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { jsPDF } from 'jspdf'

export class PDFGenerator {
  constructor() {
    this.pageWidth = 595.28 // A4 width in points
    this.pageHeight = 841.89 // A4 height in points
    this.margin = 50
  }

  async generateTranslationPDF(originalFile, extractedPages, translatedPages) {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create()
      
      // Load fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)

      // Load original PDF for reference
      const originalPdfBytes = await originalFile.arrayBuffer()
      const originalPdf = await PDFDocument.load(originalPdfBytes)
      const originalPages = originalPdf.getPages()

      // Generate pages in the specified order:
      // Original Page 1, Translation Page 1, Original Page 2, Translation Page 2, etc.
      // Then Word-to-Word mapping pages
      
      const totalPages = Math.max(extractedPages.length, translatedPages.length)
      
      // Phase 1: Original and Translation pages alternating
      for (let i = 0; i < totalPages; i++) {
        // Add original page
        if (i < originalPages.length) {
          const [copiedPage] = await pdfDoc.copyPages(originalPdf, [i])
          pdfDoc.addPage(copiedPage)
        }
        
        // Add corresponding translation page with preserved layout
        if (i < translatedPages.length) {
          const translationPage = await this.createTranslationPage(
            pdfDoc,
            extractedPages[i],
            translatedPages[i],
            helveticaFont,
            helveticaBoldFont,
            i + 1
          )
          pdfDoc.addPage(translationPage)
        }
      }

      // Phase 2: Word-to-word mapping pages
      for (let i = 0; i < translatedPages.length; i++) {
        const mappingPage = await this.createWordMappingPage(
          pdfDoc,
          translatedPages[i],
          helveticaFont,
          helveticaBoldFont,
          timesRomanFont,
          i + 1
        )
        pdfDoc.addPage(mappingPage)
      }

      // Generate final PDF bytes
      const pdfBytes = await pdfDoc.save()
      return pdfBytes
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error(`PDF generation failed: ${error.message}`)
    }
  }

  async createTranslationPage(pdfDoc, originalPage, translatedPage, font, boldFont, pageNumber) {
    const page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
    const { width, height } = page.getSize()

    // Add header
    page.drawText(`Translation - Page ${pageNumber}`, {
      x: this.margin,
      y: height - this.margin,
      size: 16,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8)
    })

    // Add a separator line
    page.drawLine({
      start: { x: this.margin, y: height - this.margin - 25 },
      end: { x: width - this.margin, y: height - this.margin - 25 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    })

    let currentY = height - this.margin - 50

    // Render translated text items with preserved positioning
    if (translatedPage.translatedTextItems && translatedPage.translatedTextItems.length > 0) {
      for (const textItem of translatedPage.translatedTextItems) {
        if (currentY < this.margin + 50) break // Prevent overflow

        // Calculate relative position (simplified)
        const relativeX = this.margin + (textItem.x || 0) * 0.5
        const relativeY = currentY - (textItem.y || 0) * 0.1

        // Determine font size based on original
        const fontSize = Math.max(8, Math.min(14, textItem.fontSize || 12))

        // Use preserved color or default
        const textColor = this.parseColor(textItem.color) || rgb(0, 0, 0)

        try {
          page.drawText(textItem.text || '', {
            x: Math.max(this.margin, Math.min(relativeX, width - this.margin - 100)),
            y: Math.max(this.margin, relativeY),
            size: fontSize,
            font: font,
            color: textColor,
            maxWidth: width - 2 * this.margin
          })
        } catch (error) {
          // Fallback for problematic text
          console.warn('Text rendering error:', error)
        }

        currentY -= fontSize + 5
      }
    } else {
      // Fallback: render as continuous text
      const translatedText = translatedPage.translatedText || 'No translation available'
      const lines = this.wrapText(translatedText, font, 12, width - 2 * this.margin)
      
      for (const line of lines) {
        if (currentY < this.margin + 20) break
        
        page.drawText(line, {
          x: this.margin,
          y: currentY,
          size: 12,
          font: font,
          color: rgb(0, 0, 0)
        })
        
        currentY -= 18
      }
    }

    // Add footer
    page.drawText(`Translated with Advanced Translation Studio`, {
      x: this.margin,
      y: this.margin - 20,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    })

    return page
  }

  async createWordMappingPage(pdfDoc, translatedPage, font, boldFont, monoFont, pageNumber) {
    const page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
    const { width, height } = page.getSize()

    // Add header
    page.drawText(`Word-to-Word Mapping - Page ${pageNumber}`, {
      x: this.margin,
      y: height - this.margin,
      size: 16,
      font: boldFont,
      color: rgb(0.8, 0.2, 0.2)
    })

    // Add separator line
    page.drawLine({
      start: { x: this.margin, y: height - this.margin - 25 },
      end: { x: width - this.margin, y: height - this.margin - 25 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    })

    // Add table headers
    let currentY = height - this.margin - 50
    const columnWidth = (width - 2 * this.margin) / 3

    page.drawText('Original', {
      x: this.margin,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    })

    page.drawText('Translation', {
      x: this.margin + columnWidth,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    })

    page.drawText('Confidence', {
      x: this.margin + 2 * columnWidth,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    })

    // Add header underline
    page.drawLine({
      start: { x: this.margin, y: currentY - 5 },
      end: { x: width - this.margin, y: currentY - 5 },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3)
    })

    currentY -= 25

    // Add word mappings
    if (translatedPage.wordMappings && translatedPage.wordMappings.length > 0) {
      for (const mapping of translatedPage.wordMappings) {
        if (currentY < this.margin + 30) break

        // Original word
        page.drawText(mapping.original || '', {
          x: this.margin,
          y: currentY,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: columnWidth - 10
        })

        // Translated word
        page.drawText(mapping.translated || '', {
          x: this.margin + columnWidth,
          y: currentY,
          size: 10,
          font: font,
          color: rgb(0, 0, 0.8),
          maxWidth: columnWidth - 10
        })

        // Confidence score
        const confidence = Math.round((mapping.confidence || 0) * 100)
        const confidenceColor = confidence > 80 ? rgb(0, 0.6, 0) : confidence > 60 ? rgb(0.8, 0.6, 0) : rgb(0.8, 0, 0)
        
        page.drawText(`${confidence}%`, {
          x: this.margin + 2 * columnWidth,
          y: currentY,
          size: 10,
          font: monoFont,
          color: confidenceColor
        })

        currentY -= 15
      }
    }

    // Add footer
    page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: this.margin,
      y: this.margin - 20,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    })

    return page
  }

  parseColor(colorString) {
    if (!colorString) return null
    
    // Handle hex colors
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1)
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return rgb(r, g, b)
      }
    }
    
    // Handle rgb() colors
    const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]) / 255
      const g = parseInt(rgbMatch[2]) / 255
      const b = parseInt(rgbMatch[3]) / 255
      return rgb(r, g, b)
    }
    
    // Default to black
    return rgb(0, 0, 0)
  }

  wrapText(text, font, fontSize, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)
      
      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // Word is too long, break it
          lines.push(word)
          currentLine = ''
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines
  }

  async downloadPDF(pdfBytes, filename = 'translation-output.pdf') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }
}

export default PDFGenerator

