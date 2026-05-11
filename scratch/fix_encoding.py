import os

replacements = {
    "Ã¡": "á",
    "Ã©": "é",
    "Ã­": "í",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã±": "ñ",
    "Ãš": "Ú",
    "Ã“": "Ó",
    "Ã‘": "Ñ",
    "Ã": "í" # Fallback for isolated Ã which is often í in this codebase context (e.g. CategorÃa)
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for bad, good in replacements.items():
            content = content.replace(bad, good)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed: {filepath}")
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")

def main():
    src_dir = r"d:\Documents\Programacion\Velora 1\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".tsx", ".ts")):
                fix_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
