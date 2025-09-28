import { useState } from 'react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [translatedText, setTranslatedText] = useState('')

  const handleTranslate = () => {
    // Simple placeholder translation
    setTranslatedText(`Translated: ${text}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Advanced Translation Studio
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Original Text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-32 p-3 border rounded-md"
                placeholder="Enter text to translate..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Translated Text
              </label>
              <textarea
                value={translatedText}
                readOnly
                className="w-full h-32 p-3 border rounded-md bg-gray-50"
                placeholder="Translation will appear here..."
              />
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={handleTranslate}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              Translate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
