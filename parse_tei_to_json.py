import xml.etree.ElementTree as ET
import json
import requests
import os

def parse_tei_from_url_to_json(tei_url):
    dictionary = {}
    try:
        response = requests.get(tei_url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        tei_content = response.text

        # A simple attempt to clean the file by removing characters before the first '<'
        first_tag_index = tei_content.find('<')
        if first_tag_index > 0:
            tei_content = tei_content[first_tag_index:]

        root = ET.fromstring(tei_content)

        # Define the namespace for TEI XML
        ns = {"tei": "http://www.tei-c.org/ns/1.0"}

        for entry in root.findall(".//tei:entry", ns):
            english_word = None
            arabic_translation = None

            form = entry.find("tei:form", ns)
            if form is not None:
                orth = form.find("tei:orth", ns)
                if orth is not None and orth.text:
                    english_word = orth.text.strip().lower()

            sense = entry.find("tei:sense", ns)
            if sense is not None:
                cit = sense.find("tei:cit", ns)
                if cit is not None:
                    quote = cit.find("tei:quote", ns)
                    if quote is not None and quote.text:
                        arabic_translation = quote.text.strip()
            
            if english_word and arabic_translation:
                dictionary[english_word] = arabic_translation

    except requests.exceptions.RequestException as e:
        print(f"HTTP request error: {e}")
    except ET.ParseError as e:
        print(f"XML parsing error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    return dictionary

if __name__ == "__main__":
    tei_cdn_url = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663166221550/FQoTXWRahfrWnZuH.tei"
    json_output_file = "en-ara.json"

    print(f"Fetching and parsing TEI from {tei_cdn_url}...")
    tei_dictionary = parse_tei_from_url_to_json(tei_cdn_url)
    print(f"Found {len(tei_dictionary)} entries in TEI file")

    with open(json_output_file, "w", encoding="utf-8") as f:
        json.dump(tei_dictionary, f, ensure_ascii=False, indent=2)
    print(f"Converted TEI dictionary saved to {json_output_file}")

    # Combine with medical_dictionary.json
    medical_dict_file = "medical_dictionary.json"
    combined_output_file = "public/combined_dictionary.json"

    try:
        with open(medical_dict_file, "r", encoding="utf-8") as f:
            medical_dictionary = json.load(f)
        print(f"Loaded {len(medical_dictionary)} entries from {medical_dict_file}")

        combined_dictionary = {**tei_dictionary, **medical_dictionary}

        # Ensure the 'public' directory exists
        os.makedirs(os.path.dirname(combined_output_file), exist_ok=True)

        with open(combined_output_file, "w", encoding="utf-8") as f:
            json.dump(combined_dictionary, f, ensure_ascii=False, indent=2)
        print(f"Combined dictionary saved to {combined_output_file}")

    except FileNotFoundError:
        print(f"Error: {medical_dict_file} not found. Please ensure it's in the correct directory.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {medical_dict_file}. Check file format.")
    except Exception as e:
        print(f"An error occurred during dictionary combination: {e}")


