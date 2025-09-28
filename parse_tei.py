import xml.etree.ElementTree as ET
import json

def parse_tei_to_dict(tei_file_path):
    dictionary = {}
    tree = ET.parse(tei_file_path)
    root = tree.getroot()

    # TEI namespace
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}

    for entry in root.findall(".//tei:entry", ns):
        form = entry.find("tei:form/tei:orth", ns)
        senses = entry.findall("tei:sense/tei:cit/tei:quote", ns)

        if form is not None and senses:
            english_word = form.text.strip().lower()
            arabic_translations = [sense.text.strip() for sense in senses if sense.text]
            if english_word and arabic_translations:
                # For simplicity, let's take the first translation or join them
                dictionary[english_word] = arabic_translations[0]
    return dictionary

if __name__ == "__main__":
    tei_file = "en-ara.tei"
    output_json_file = "en_ara_parsed.json"

    parsed_data = parse_tei_to_dict(tei_file)
    with open(output_json_file, "w", encoding="utf-8") as f:
        json.dump(parsed_data, f, ensure_ascii=False, indent=2)
    print(f"Parsed {tei_file} and saved to {output_json_file}")


