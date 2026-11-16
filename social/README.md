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
   Keep it simple and relatable: everyday moments people actually have (coffee, the commute, a tired Tuesday, dishes in the sink, a kind text, small wins). Nothing fancy, abstract or preachy. Example morning: "If all you did this morning was get out of bed, *that counts.*" Example evening: "What was one *good little moment* today?" with small "A warm coffee counts. So does a kind text."
   Visual style: render.js is the current approved style (v1). render-v2.js is a new calmer design waiting for Kavin's OK; do NOT use it until Kavin approves it, then it gets copied over render.js. Keep text short (about 6 to 16 words).
3. Pick a format per the slot rules above (morning rotates so no format runs twice in a row):
   - `quote` + `"video":true` : light sunrise, big serif message, 8s animated MP4 (sun rises, text fades in). Best for TikTok/Reels.
   - `evening` : dark green, a gentle journal question (shows the evening side of amivo).
   - `card` : looks like the app's message card (eyebrow = a category from messages.json, e.g. "Hope for hard days").
   - `quote` with `slides` (3 to 5) : a carousel / TikTok photo slideshow, e.g. "3 small ways to…". Use `counter` "1 / 4".
   Wrap 1 to 3 words in `*stars*` for the gold italic accent. Use curly apostrophes.
4. Write `<slot folder>/spec.json`, run `node tools/render.js <slot folder>/spec.json <slot folder>` (needs network for Google Fonts, about 1 minute with video).
5. Look at post.png and feed.jpg before sharing. render.js makes post.png (9:16) and post.mp4 when "video":true (v2 also makes feed.jpg 1080×1350; with v1 the auto-post pads post.png to 4:5). Give every single-image post "video":true so each slot has a Reel. Write `caption.txt`: hook line, 1 to 3 short lines, a soft question or "send this to someone", then
   "amivo sends a short, kind message every morning and a gentle question every evening. Try it free at amivo.ca (link in bio)." and 6 to 10 hashtags (mix broad + niche, always #amivo).
6. Append a line to `posts-log.md`, then post the files and caption in the thread.

Brand: bg #f8f6ef, ink #274b3e, gold #c8a56b, greens #3e7b62 / #274b3e, sun #e0a95a. Fonts Newsreader (serif) + Inter.

## Instagram auto-post (via Windsor)
A scheduled task at ~7:07 AM and ~7:07 PM Winnipeg publishes each slot to Instagram **amivo.app** (Windsor account 17841452885698234) as **two posts**: a Reel (`create_video_post` with post.mp4) and an image post (`create_image_post` with feed.jpg), both using caption.txt. So 4 Instagram posts a day.
- **feed.jpg** = a 1080×1350 (4:5) JPEG of the same design, under 8 MB. Instagram feed images must be JPEG with an aspect ratio between 4:5 and 1.91:1, so the 9:16 post.png can't be used directly. Each slot folder should get a feed.jpg rendered at 1080×1350 by the daily thread. If it's missing, the auto-post makes one by fitting post.png onto a 1080×1350 canvas: `ffmpeg -y -i post.png -vf "scale=-1:1350,pad=1080:1350:(ow-iw)/2:0:color=#f8f6ef" -q:v 2 feed.jpg` (use color=#1c2823 for evening).
- **Slides days:** if the slot folder has feed-1.jpg, feed-2.jpg… instead of feed.jpg, the image post is a carousel: commit all feed-N.jpg and use `create_carousel_post` with {image_urls: [their URLs in order], caption}. This overrides the create_image_post / feed.jpg step in the auto-post task.
- Instagram needs public URLs. The MP4 and feed.jpg are committed to the amivo.com repo on the session's working branch (under `social/<date>/` or `social/<date>-evening/`) and passed as `https://raw.githubusercontent.com/benkavin/amivo.com/<branch>/<folder>/post.mp4` (and feed.jpg).
- The Reel always goes out. Still formats become an 8 s video: `ffmpeg -y -loop 1 -t 8 -i post.png -f lavfi -t 8 -i anullsrc=r=44100:cl=stereo -vf "scale=1080:1920,format=yuv420p" -c:v libx264 -r 30 -c:a aac -shortest -movflags +faststart post.mp4`. Carousels become a slideshow (about 3 s per slide).
- TikTok can't be posted through Windsor (read-only), so TikTok stays manual from the files in the daily thread.
- Log the Instagram media id at the end of that slot's line in posts-log.md as `| ig reel: <id> | ig image: <id>`.
