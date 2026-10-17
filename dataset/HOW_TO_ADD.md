# How to add images and messages (no coding needed)

Everything in the game comes from one spreadsheet: **`dataset/items.csv`**. One row = one image or one message.

## Add a message (text)

1. Open `dataset/items.csv` on GitHub (pencil icon ✏️ to edit), or in Excel / Numbers / Google Sheets.
2. Add a new row at the bottom. You only **need** three columns:

   | column     | what to write                                                                  |
   | ---------- | ------------------------------------------------------------------------------ |
   | `content`  | the message itself                                                             |
   | `is_real`  | `yes` or `no`                                                                  |
   | `category` | `ai-vs-human` (was it written by a person or AI?) or `scam-vs-legit`           |

   In `scam-vs-legit`, **yes = legitimate**, **no = scam**. In `ai-vs-human`, **yes = written by a person**.

3. Save / commit. Done.

## Add an image

1. On GitHub, open the folder `dataset/inbox/` → **Add file → Upload files**, and upload your picture (`.jpg` or `.png`).
2. Add a row to `dataset/items.csv` with:
   - `content` = the exact file name, e.g. `my-photo.jpg`
   - `is_real` = `yes` (real photo) or `no` (AI-generated)
   - `category` = `ai-image` (or leave it empty, images default to this)
3. Save / commit.

Only use images you are allowed to use: your own photos, AI images you generated yourself, or freely licensed ones.
**No photos of real people's faces, no personal data.** Write where the image came from in `source_dataset`,
`source_license` and `source_author`.

## Optional columns (Claude fills these if you leave them empty)

| column        | meaning                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `difficulty`  | 1 = obvious … 5 = very hard to tell                                                                         |
| `clues`       | things a player can spot, separated by `;` e.g. `six fingers; blurry text on sign`                          |
| `explanation` | 1–2 friendly sentences shown after the player answers                                                       |
| `subject`     | short topic like `bird`, `landscape`, `bank`, `delivery`. Items with the same subject get paired together. |

If you write your own difficulty, it is kept as a **team** rating. You can always overwrite what Claude wrote.

## Then (the builder does this)

```bash
npm run data
```

This moves new images from `inbox/` into `images/real` or `images/fake`, gives every row an id, asks Claude to fill
empty difficulty / clues / explanation, checks for mistakes and writes `dataset/items.json` (what the app reads).
Problems are printed in plain words, e.g. `Row 97: is_real must be yes or no, not "maybe".`
Commit and push the result.
