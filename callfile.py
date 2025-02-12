import os

def extract_filenames(folder_path, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        for root, _, files in os.walk(folder_path):
            for file in files:
                relative_path = os.path.relpath(os.path.join(root, file), folder_path)
                f.write(f'\"\{folder_path}\{relative_path}",\n')
    print(f"Nama file berhasil disimpan dalam {output_file}")

folder_path = "svgs"
output_file = r"C:\Users\asus\OneDrive - mail.unnes.ac.id\Documents\GitHub\MentalHealth\nama_file.txt"

extract_filenames(folder_path, output_file)
