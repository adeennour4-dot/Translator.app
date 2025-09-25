// Mock translation service with word-to-word mapping
// In a real implementation, this would connect to translation APIs like Google Translate, OpenAI, etc.

export class TranslationService {
  constructor() {
    this.dictionary = {};
    this.phrases = {};
    this.isDictionaryLoaded = false;
    this.loadDictionary();
  }

  async loadDictionary() {
    try {
      const response = await fetch('/combined_dictionary.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.dictionary = await response.json();
      this.isDictionaryLoaded = true;
      console.log('Combined dictionary loaded successfully.');
    } catch (error) {
      console.error('Failed to load the combined dictionary:', error);
      // Fallback to a small inline dictionary in case of failure
      this.dictionary = {
        'hello': 'مرحبا',
        'world': 'عالم',
        'error': 'خطأ',
        'loading': 'تحميل',
        'dictionary': 'قاموس'
      };
    }
  }

  async translatePages(pages, onProgress = () => {}) {
    const translatedPages = []
    const totalPages = pages.length

    for (let i = 0; i < totalPages; i++) {
      onProgress(
        (i / totalPages) * 100,
        `Translating page ${i + 1} of ${totalPages}...`
      )

      const page = pages[i]
      const translatedPage = await this.translatePage(page)
      translatedPages.push(translatedPage)

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    onProgress(100, 'Translation complete!')
    return translatedPages
  }

  async translatePage(page) {
    const translatedTextItems = []
    const wordMappings = []

    for (const textItem of page.textItems) {
      const translatedItem = await this.translateTextItem(textItem)
      translatedTextItems.push(translatedItem)

      // Create word-to-word mappings
      const mappings = this.createWordMappings(textItem.text, translatedItem.text)
      wordMappings.push(...mappings)
    }

    return {
      ...page,
      translatedText: translatedTextItems.map(item => item.text).join(' '),
      translatedTextItems: translatedTextItems,
      wordMappings: wordMappings,
      originalText: page.text
    }
  }

  async translateTextItem(textItem) {
    const translatedText = await this.translateText(textItem.text)
    
    return {
      ...textItem,
      text: translatedText,
      originalText: textItem.text
    }
  }

  async translateText(text) {
    // Clean and prepare text
    const cleanText = text.trim().toLowerCase()
    
    // Check for exact phrase matches first
    for (const [phrase, translation] of Object.entries(this.phrases)) {
      if (cleanText.includes(phrase)) {
        return text.replace(new RegExp(phrase, 'gi'), translation)
      }
    }

    // Split into words and translate individually
    const words = text.split(/\s+/)
    const translatedWords = words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '')
      return this.dictionary[cleanWord] || this.generateMockTranslation(word)
    })

    return translatedWords.join(' ')
  }

  createWordMappings(originalText, translatedText) {
    const originalWords = originalText.split(/\s+/)
    const translatedWords = translatedText.split(/\s+/)
    const mappings = []

    // Create simple word-to-word mappings
    const maxLength = Math.max(originalWords.length, translatedWords.length)
    
    for (let i = 0; i < maxLength; i++) {
      const originalWord = originalWords[i] || ''
      const translatedWord = translatedWords[i] || ''
      
      if (originalWord && translatedWord) {
        mappings.push({
          original: originalWord,
          translated: translatedWord,
          confidence: this.dictionary[originalWord.toLowerCase().replace(/[^\w]/g, '')] ? 1.0 : 0.7,
          position: i
        })
      }
    }

    return mappings
  }

  generateMockTranslation(word) {
    // Generate a mock Arabic translation for unknown words
    const arabicChars = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي']
    
    // Keep original if it's a number or special character
    if (/^\d+$/.test(word) || /^[^\w]$/.test(word)) {
      return word
    }

    // Generate a translation based on word length
    const length = Math.min(word.length, 6)
    let translation = ''
    
    for (let i = 0; i < length; i++) {
      translation += arabicChars[Math.floor(Math.random() * arabicChars.length)]
    }
    
    return translation
  }

  async getTranslationStats(translatedPages) {
    const stats = {
      totalPages: translatedPages.length,
      totalWords: 0,
      translatedWords: 0,
      medicalTerms: 0,
      confidence: 0
    }

    let totalConfidence = 0
    let confidenceCount = 0

    for (const page of translatedPages) {
      stats.totalWords += page.textItems.length
      stats.translatedWords += page.translatedTextItems.length

      // Count medical terms
      for (const mapping of page.wordMappings) {
        if (this.isMedicalTerm(mapping.original)) {
          stats.medicalTerms++
        }
        totalConfidence += mapping.confidence
        confidenceCount++
      }
    }

    stats.confidence = confidenceCount > 0 ? (totalConfidence / confidenceCount) : 0

    return stats
  }

  isMedicalTerm(word) {
    const medicalTerms = [
      'medical', 'patient', 'doctor', 'hospital', 'treatment', 'diagnosis',
      'medicine', 'health', 'blood', 'pressure', 'heart', 'lung', 'brain',
      'surgery', 'emergency', 'clinic', 'pharmacy', 'nurse', 'pain', 'fever',
      'infection', 'vaccine', 'therapy', 'examination', 'prescription',
      'symptom', 'disease', 'recovery'
    ]
    
    return medicalTerms.includes(word.toLowerCase().replace(/[^\w]/g, ''))
  }

  // Method to export word-to-word mappings as structured data
  exportWordMappings(translatedPages) {
    const allMappings = []
    
    translatedPages.forEach((page, pageIndex) => {
      page.wordMappings.forEach(mapping => {
        allMappings.push({
          page: pageIndex + 1,
          original: mapping.original,
          translated: mapping.translated,
          confidence: mapping.confidence,
          isMedical: this.isMedicalTerm(mapping.original)
        })
      })
    })

    return allMappings
  }
}

export default TranslationService

