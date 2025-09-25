import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import download from 'downloadjs';

class PDFGenerator {
  async generateTranslationPDF(originalFile, translatedPages) {
    try {
      const pdfDoc = await PDFDocument.create();
      
      // --- FONT LOADING FIX ---
      // 1. Fetch the custom font file that supports Arabic
      const fontResponse = await fetch('/fonts/NotoSansArabic-Regular.ttf');
      if (!fontResponse.ok) throw new Error("Font file not found.");
      const fontBytes = await fontResponse.arrayBuffer();

      // 2. Embed the custom font into the PDF document
      const customFont = await pdfDoc.embedFont(fontBytes);
      // --- END OF FIX ---

      // Load original PDF to copy pages from it
      const originalPdfBytes = await originalFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(originalPdfBytes);

      for (let i = 0; i < translatedPages.length; i++) {
        // Add original page
        if (i < originalPdf.getPageCount()) {
          const [copiedPage] = await pdfDoc.copyPages(originalPdf, [i]);
          pdfDoc.addPage(copiedPage);
        }
        
        // Add a new page for our translation
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        page.drawText(`Translation - Page ${i + 1}`, {
          x: 50,
          y: height - 60,
          font: await pdfDoc.embedFont(StandardFonts.HelveticaBold), // Use a standard font for headers
          size: 18,
          color: rgb(0.1, 0.1, 0.1),
        });

        const translatedPage = translatedPages[i];
        let yPosition = height - 100;

        // 3. Use the embedded custom font to draw the translated text
        for (const item of translatedPage.textItems) {
            if (yPosition < 50) break; // Stop if we run out of space
            
            page.drawText(item.translatedText, {
              x: 50,
              y: yPosition,
              font: customFont, // Use the special font here!
              size: 12,
              color: rgb(0, 0, 0),
              lineHeight: 18,
              maxWidth: width - 100,
            });
            yPosition -= (item.translatedText.split('\n').length * 18);
        }
      }

      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
  
  async downloadPDF(pdfBytes, filename) {
    download(pdfBytes, filename, 'application/pdf');
  }
}

export default PDFGenerator;
