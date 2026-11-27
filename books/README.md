# books

Sanskrit texts organized by collection, with our own English rendering of each verse.
Each book is one JSON file holding per-verse Sanskrit, transliteration and the English
rendering (`translation_reworded`). A Markdown version sits beside each JSON file.

| Folder | Contents |
| --- | --- |
| `Upanishads/` | Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Chandogya, Kaivalya |
| `Bhagavad-Gita/` | 18 chapters, one file each |
| `Gitas/` | Ashtavakra Gita, Avadhuta Gita |
| `Sutras/` | Brahma Sutras, Yogasutra |
| `Prakarana-Granthas/` | Shankara's introductory works (Vivekachudamani, Atmabodha, Tattvabodha, the Panchakams, ...) |
| `Ramana-Maharshi/` | Ulladu Narpadu and Anubandham, Upadesa Saaram, Upadesa Undiyar, Saddarshanam, Anma Viddai |

`scripts/render_md.py` regenerates the Markdown from the JSON: `python3 -I scripts/render_md.py`.

Some Brahma Sutras, Prashnopanishad and Taittiriya entries contain two English renderings,
separated by a blank line.
