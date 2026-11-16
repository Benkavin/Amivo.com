# amivo daily social post

One ready-to-post item each morning (about 7 AM Winnipeg), for TikTok and Instagram, posted by hand.

## Daily steps
1. If `posts/<today>/` already has a post.png, stop: today is done (no reply needed). Otherwise read `posts-log.md` so today's message, theme and format don't repeat recent days.
2. Write an original message in amivo's voice: short, warm, plain words, no pressure, no clichés, no medical claims.
3. Pick a format, rotating so no format runs twice in a row:
   - `quote` + `"video":true` : light sunrise, big serif message, 8s animated MP4 (sun rises, text fades in). Best for TikTok/Reels.
   - `evening` : dark green, a gentle journal question (shows the evening side of amivo).
   - `card` : looks like the app's message card (eyebrow = a category from messages.json, e.g. "Hope for hard days").
   - `quote` with `slides` (3 to 5) : a carousel / TikTok photo slideshow, e.g. "3 small ways to…". Use `counter` "1 / 4".
   Wrap 1 to 3 words in `*stars*` for the gold italic accent. Use curly apostrophes.
4. Write `posts/YYYY-MM-DD/spec.json`, run `node tools/render.js posts/YYYY-MM-DD/spec.json posts/YYYY-MM-DD` (needs network for Google Fonts, about 1 minute with video).
5. Look at the PNG before sharing. Write `caption.txt`: hook line, 1 to 3 short lines, a soft question or "send this to someone", then
   "amivo sends a short, kind message every morning and a gentle question every evening. Try it free at amivo.ca (link in bio)." and 6 to 10 hashtags (mix broad + niche, always #amivo).
6. Append a line to `posts-log.md`, then post the files and caption in the thread.

Brand: bg #f8f6ef, ink #274b3e, gold #c8a56b, greens #3e7b62 / #274b3e, sun #e0a95a. Fonts Newsreader (serif) + Inter.

## Instagram auto-post (via Windsor)
A daily scheduled task (~7:07 AM Winnipeg) publishes each day's post to Instagram **amivo.app** as a Reel with Windsor's `instagram` / `create_video_post` (account 17841452885698234), using caption.txt as the caption.
- Instagram needs a public URL. The MP4 is committed to the amivo.com repo on the session's working branch (under `social/<date>/`) and passed as `https://raw.githubusercontent.com/benkavin/amivo.com/<branch>/social/<date>/post.mp4`.
- Every day goes out as a Reel. Still formats become an 8 s video: `ffmpeg -y -loop 1 -t 8 -i post.png -f lavfi -t 8 -i anullsrc=r=44100:cl=stereo -vf "scale=1080:1920,format=yuv420p" -c:v libx264 -r 30 -c:a aac -shortest -movflags +faststart post.mp4`. Carousels become a slideshow (about 3 s per slide).
- TikTok can't be posted through Windsor (read-only), so TikTok stays manual from the files in the daily thread.
- Log the Instagram media id at the end of that day's line in posts-log.md as `| ig: <id>`.
