import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// ... (inside your App component)

const exportPDF = async () => {
  if (!selectedFile || !translatedPages.length) {
    setError('No data to export.');
    return;
  }

  setIsProcessing(true);
  setProgress(0);
  setProgressMessage('Generating final PDF...');
  setError(null);

  try {
    const pdfBlob = await pdfGenerator.generateTranslatedPDF(
      selectedFile,
      translatedPages,
      (p, m) => {
        setProgress(p);
        setProgressMessage(m);
      }
    );

    // --- FIX: Correctly save the file on Capacitor ---
    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);
    reader.onloadend = async () => {
      const base64data = reader.result;

      const fileName = `translated_${Date.now()}.pdf`;
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64data,
          directory: Directory.Documents,
        });

        setProgress(100);
        setProgressMessage(`PDF exported successfully! Saved in Documents as ${fileName}`);
      } catch (e) {
        console.error('Error saving file', e);
        setError(`Export failed: ${e.message}`);
      }
    };

  } catch (err) {
    console.error('Export error:', err);
    setError(`Export failed: ${err.message}`);
  } finally {
    setIsProcessing(false);
  }
};
