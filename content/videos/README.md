# Real vs AI videos

Short video clips for the "Real or Fake?" game and the daily feed. Each clip is labelled real or AI.

| File                     | What it is                                                         |
| ------------------------ | ------------------------------------------------------------------ |
| `real_vs_ai_videos.xlsx` | The team's list of clips (name, link, description, notes, label, Pair ID). |
| `videos.json`            | What the app reads. One entry per clip, written from the sheet.    |

The videos are **not stored in git**. The app plays them from Canva or TikTok inside the page (an embedded player).

## Add a video (5 steps)

1. **Add a row to `real_vs_ai_videos.xlsx`**: name, link, what happens, clues in Notes, Real or AI, and a **Pair ID**.
   Give a real clip and its AI look-alike the same Pair ID (e.g. both `4`): the game shows them side by side.
2. **Give it a neutral title where it is hosted.** In Canva the design title can appear in the player. "reading_real"
   gives the answer away, so call it "Clip 5". The link stays the same.
3. **Make the embed link** (the version of the link that plays inside our app):

   | Where the video lives | Share link looks like                       | Embed link to put in `content`                                                 |
   | --------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
   | Canva                 | `canva.link/…` → `canva.com/design/A/B/edit` | `https://www.canva.com/design/A/B/view?embed` (share "Anyone with the link")   |
   | TikTok                | `tiktok.com/@user/video/123…`               | `https://www.tiktok.com/player/v1/123…?description=0&music_info=0&rel=0`       |
   | YouTube               | `youtube.com/watch?v=ABC`                   | `https://www.youtube-nocookie.com/embed/ABC`                                   |

   Short links (`canva.link`, `tt.site`, `youtu.be`) open in a browser and show the full address.

4. **Add an entry to `videos.json`.** Copy an existing one and change it. Use the next free id (`vid-0005`), never
   renumber old ids, and set `is_real` (`true` = real, `false` = AI), `pair` (the sheet's Pair ID), `subject`, `difficulty` 1–5, `clues`, `explanation`, German `de` text and `source` (who made it, where from).
   Claude can do this step for you: paste the sheet row and ask.
5. **Run `npm run check`** (the tests check every entry), then open the app and watch the clip once to make sure nothing
   on screen gives the answer away.

To show a clip in a day's feed, add `"video:vid-0005"` to `content/feed/<date>.json`. Every video is also used in the
"Real or Fake?" game (`#/play`) automatically: each game shows two video pairs, picked by Pair ID
(`getFixedPairs` in `dataset/loader.js`). The tests check that every Pair ID joins exactly one real and one AI clip.
