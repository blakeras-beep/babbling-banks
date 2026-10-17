# Videos

Two animated videos built from brand v1.5 (`brand/babbling-banks-brand-v1.5/`): Banks' art, tape strips, lemon match swipes, the ink crayon arrow, and the brand fonts.

| File                | What                                                                | Size        | Length |
| ------------------- | ------------------------------------------------------------------- | ----------- | ------ |
| `out/explainer.mp4` | How-to: say it, tap Find it, "or maybe…", open and keep it          | 1920 × 1080 | 52 s   |
| `out/ad.mp4`        | Customer ad: four real decodes, then "Find it at babblingbanks.com" | 1080 × 1920 | 24 s   |

Every decode shown is the app's real top result for that query (`src/lib/search.js`).

## Sound

Each page lists its music and voiceover cues (`VIDEO.music`, `VIDEO.vo`). The renderer mixes them with the foley from `audio.mjs` and ducks the music under the voice.

- `music/cant-stop.wav` and `vo/*.wav` are local only (gitignored), and so is `out/`, because the renders contain the song. Missing files are skipped: with no song, `audio.mjs` synthesizes an original funk-rock groove instead.
- The voiceover is Higgsfield `text2speech_v2` (ElevenLabs), voice "Juno". Drop the clips in `vo/` untouched; each page's cue times are set from the clips' word timings, and the explainer's `WARP` keypoints move each tap to just after the line that describes it.

## Edit and re-render

Each video is one HTML page whose `render(t)` draws any moment from `t` alone (`engine.js`).

```sh
npm ci
node marketing/videos/render.mjs explainer            # writes out/explainer.mp4
node marketing/videos/render.mjs ad                   # writes out/ad.mp4
node marketing/videos/render.mjs ad --stills 2,8,20   # PNG frames, for checking
```

To preview live, serve the repo root (`npx vite --open marketing/videos/ad.html`); `?t=12` starts at 12 s.
