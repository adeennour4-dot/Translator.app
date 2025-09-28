
import fs from 'fs';
import { Parser } from 'xml2js';

async function parseTei(filePath) {
    let data = fs.readFileSync(filePath, 'utf8');
    // A simple attempt to clean the file by removing characters before the first '<'
    const firstTagIndex = data.indexOf('<');
    if (firstTagIndex > 0) {
        data = data.substring(firstTagIndex);
    }

    const parser = new Parser();
    const result = await parser.parseStringPromise(data);
    const dictionary = {};

    if (result.TEI && result.TEI.text && result.TEI.text[0] && result.TEI.text[0].body && result.TEI.text[0].body[0] && result.TEI.text[0].body[0].entry) {
        for (const entry of result.TEI.text[0].body[0].entry) {
            if (entry.form && entry.form[0] && entry.form[0].orth && entry.form[0].orth[0] && entry.sense && entry.sense[0] && entry.sense[0].cit && entry.sense[0].cit[0] && entry.sense[0].cit[0].quote && entry.sense[0].cit[0].quote[0]) {
                const englishWord = entry.form[0].orth[0]._.trim().toLowerCase();
                const arabicTranslation = entry.sense[0].cit[0].quote[0]._.trim();
                if (englishWord && arabicTranslation) {
                    dictionary[englishWord] = arabicTranslation;
                }
            }
        }
    }
    return dictionary;
}

async function combineDictionaries() {
    try {
        const teiDict = await parseTei('en-ara.tei');
        const medicalDict = JSON.parse(fs.readFileSync('medical_dictionary.json', 'utf8'));

        const combined = { ...teiDict, ...medicalDict };

        fs.writeFileSync('public/combined_dictionary.json', JSON.stringify(combined, null, 2));
        console.log('Successfully combined dictionaries into public/combined_dictionary.json');
    } catch (error) {
        console.error('Error combining dictionaries:', error);
    }
}

combineDictionaries();


