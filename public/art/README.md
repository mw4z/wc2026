# Brand art slots

The app reads these optional files at runtime. Drop your own **licensed** images
here and they appear automatically — no code change needed. Until a file exists,
the app falls back to original vector art.

| File | Where it shows | Notes |
|------|----------------|-------|
| `logo.png` | Header, login screen | Square-ish, transparent PNG. Falls back to the original "26" vector mark. |
| `mascot.png` | Hero banners (bottom-left) | Transparent PNG. Hidden entirely if the file is absent. |

Recommended: transparent-background PNG, ~512px on the long edge.

> Only add art you have the rights to use. Official FIFA World Cup 26 logos and
> mascots are trademarked/copyrighted and are intentionally **not** bundled in
> this repo.
