# amivo daily social post

Two posts a day for TikTok and Instagram: a **morning** post (about 7 AM Winnipeg) and an **evening** post (about 7 PM). Instagram is published automatically (see below); TikTok is posted by hand from the daily thread.

## Slots
- **Morning** → folder `posts/<date>/`. A kind message for the day. Rotate between `quote`+video, `card` and `slides` (never `evening`).
- **Evening** → folder `posts/<date>-evening/`. Always the `evening` format with `"video":true`: dark green, one gentle reflection question like the app's evening journal prompt (e.g. "What felt a little lighter today?"), with a soft `small` line. Eyebrow like "Tonight, a gentle question".
- The two slots never repeat each other: before writing, read posts-log.md and avoid any message, question or theme from the last 7 days in either slot. The evening question can gently echo the morning theme but must not reuse its words.
- Log one line per slot: `- YYYY-MM-DD Mon AM | format | message | theme: …` or `… PM | …`.

## Daily steps (for one slot)
1. If that slot's folder already has a post.png, stop: it's done (no reply needed). Otherwise read `posts-log.md` so the message, theme and format don't repeat recent posts.
2. Write an original message in amivo's voice: short, warm, plain words, no pressure, no clichés, no medical claims.
3. Pick a format per the slot rules above (morning rotates so no format runs twice in a row):
   - `quote` + `"video":true` : light sunrise, big serif message, 8s animated MP4 (sun rises, text fades in). Best for TikTok/Reels.
   - `evening` : dark green, a gentle journal question (shows the evening side of amivo).
   - `card` : looks like the app's message card (eyebrow = a category from messages.json, e.g. "Hope for hard days").
   - `quote` with `slides` (3 to 5) : a carousel / TikTok photo slideshow, e.g. "3 small ways to…". Use `counter` "1 / 4".
   Wrap 1 to 3 words in `*stars*` for the gold italic accent. Use curly apostrophes.
4. Write `<slot folder>/spec.json`, run `node tools/render.js <slot folder>/spec.json <slot folder>` (needs network for Google Fonts, about 1 minute with video).
5. Look at the PNG before sharing. Write `caption.txt`: hook line, 1 to 3 short lines, a soft question or "send this to someone", then
   "amivo sends a short, kind message every morning and a gentle question every evening. Try it free at amivo.ca (link in bio)." and 6 to 10 hashtags (mix broad + niche, always #amivo).
6. Append a line to `posts-log.md`, then post the files and caption in the thread.

Brand: bg #f8f6ef, ink #274b3e, gold #c8a56b, greens #3e7b62 / #274b3e, sun #e0a95a. Fonts Newsreader (serif) + Inter.

## Instagram auto-post (via Windsor)
A scheduled task at ~7:07 AM and ~7:07 PM Winnipeg publishes that slot's post to Instagram **amivo.app** as a Reel with Windsor's `instagram` / `create_video_post` (account 17841452885698234), using caption.txt as the caption.
- Instagram needs a public URL. The MP4 is committed to the amivo.com repo on the session's working branch (under `social/<date>/` or `social/<date>-evening/`) and passed as `https://raw.githubusercontent.com/benkavin/amivo.com/<branch>/<folder>/post.mp4`.
- Every day goes out as a Reel. Still formats become an 8 s video: `ffmpeg -y -loop 1 -t 8 -i post.png -f lavfi -t 8 -i anullsrc=r=44100:cl=stereo -vf "scale=1080:1920,format=yuv420p" -c:v libx264 -r 30 -c:a aac -shortest -movflags +faststart post.mp4`. Carousels become a slideshow (about 3 s per slide).
- TikTok can't be posted through Windsor (read-only), so TikTok stays manual from the files in the daily thread.
- Log the Instagram media id at the end of that slot's line in posts-log.md as `| ig: <id>`.
