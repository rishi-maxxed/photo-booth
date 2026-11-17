# Strip Booth

A photo booth that runs in any modern browser on desktop and Android. It takes 4 or 5 photos with a countdown, lets you choose how they are laid out and styled, and saves the result as a PNG, an animated GIF, or a 4 x 6 print sheet. Everything happens on the device. No photos are uploaded and there is no backend.

## What is in it

- Camera booth with a 3, 5 or 10 second countdown, screen flash, shutter sounds, front/back camera switch, a framing guide, and retake for any single photo
- 5 layouts: classic strip, grid, polaroids, wide strip, big and small
- 20 designs: Classic, Midnight, Sunset, Pixel, Polka, Checker, Film, Confetti, Hearts, Vintage paper, Neon, Holographic, Gingham, Comic pop, Vaporwave, Sakura, Blueprint, Watercolor, Candy stripes, Art deco gold
- 9 photo frames that work on any design: Soft round, Gold frame, Stitched, Taped on, Postage stamp, Film cell, Ticket stub, Retro window, Doodle (or keep each design's own border)
- Adjust tab: move and zoom each photo inside its slot (drag, pinch, mouse wheel, or sliders), up to 3x, with reset per photo or for all. It applies to the preview, PNG, GIF and print sheet
- 10 filters: Original, Black and white, Sepia, Vintage, Warm, Cool, Vivid, Faded, Noir, Pixel
- 24 emoji stickers you can drag, pinch to resize and turn, or adjust with buttons
- Caption and date in 5 styles (script, pixel, handwritten, bold, typewriter)
- Save as PNG, share through the Android share sheet, animated GIF, 4 x 6 print sheet (two strips side by side), or print
- Gallery upload as a fallback when the camera is blocked or missing
- Installs as an app on Android and works offline (PWA)

## Run it on your computer

The camera only works on `https://` or `localhost`, so open the files through a small local server. Opening `index.html` by double-click will not work.

**Windows** (PowerShell, inside the project folder)

```
py -m http.server 8000
```

**macOS** (Terminal, inside the project folder)

```
python3 -m http.server 8000
```

Then open http://localhost:8000 in Chrome and allow the camera.

To get into the folder: unzip `strip-booth.zip`, then in File Explorer (Windows) right-click inside the folder and choose "Open in Terminal", or on macOS type `cd ` in Terminal and drag the folder onto the window.

## Put it online (Vercel) so it works on your phone

Your phone needs a real `https://` address. Vercel gives you one for free.

1. Create an empty repository on github.com named `strip-booth` (no README, no .gitignore).
2. In the project folder, run these in PowerShell (Windows) or Terminal (macOS):

   ```
   git init
   git add .
   git commit -m "Strip Booth"
   git branch -M main
   git remote add origin https://github.com/rishi-jha-exe/strip-booth.git
   git push -u origin main
   ```

3. Go to vercel.com, choose Add New, then Project, and import the `strip-booth` repository.
4. Set Framework Preset to **Other**. Leave Build Command and Output Directory empty. Choose Deploy.
5. Open the `.vercel.app` address in Chrome on your Android phone, allow the camera, then open the Chrome menu and choose **Install app** (or **Add to Home screen**).

Every later `git push` redeploys automatically. `vercel.json` already sets the camera permission header.

## Changing things later

| To change | Edit |
| --- | --- |
| Add or change a design | `js/designs.js` (first 11) or `js/designs-more.js` (the other 9); each has a `paint` function, and `js/design-kit.js` has the shared drawing helpers |
| Change how photos are moved and zoomed in their slots | `cropRect` in `js/render.js`, the adjust helpers in `js/editor.js`, and `getAdj`/`setAdj` in `js/store.js` |
| Add or change a photo frame | `js/frames.js` (the `FRAMES` list; frames are drawn in a 300-unit-wide box and scaled to fit) |
| Add or change a layout | `js/layouts.js` |
| Add a filter | `js/filters.js` (`FILTERS` and `PARAMS`) |
| Add stickers | `STICKERS` in `js/designs.js` |
| Colors and fonts of the app itself | `css/style.css` (`:root` variables at the top) |

Each file has a short comment at the top that says what it does.

**After you publish a change**, bump the `CACHE` name in `sw.js` (this version uses `stripbooth-v2`, so the next change would be `stripbooth-v3`) so installed copies pick up the new files. If you add or remove files, add or remove them in the `ASSETS` list in `sw.js` too.

## Files

```
index.html            page structure for all three screens
css/style.css         all styling
js/main.js            navigation, start screen, settings, install prompt
js/booth.js           camera screen, countdown sequence, retakes
js/camera.js          getUserMedia wrapper, camera flip, frame capture
js/editor.js          editor tabs, sticker gestures, export buttons
js/render.js          canvas compositing (photos, frames, caption, stickers)
js/layouts.js         layout geometry
js/designs.js         first 11 designs, caption fonts, sticker list
js/designs-more.js    9 more designs
js/design-kit.js      drawing helpers shared by the designs and frames
js/frames.js          photo frames and their shapes
js/filters.js         photo filters (pixel math)
js/export.js          PNG, GIF, print sheet, share, print
js/upload.js          gallery photo picker
js/audio.js           synthesized countdown and shutter sounds
js/demo.js            drawn sample photos for the start screen
js/store.js           saved settings and session state
js/dom.js             small DOM helpers, dialogs, toasts
js/vendor/gifenc.js   GIF encoder (MIT license)
fonts/                Alfa Slab One, Lato, Shrikhand, Bricolage Grotesque, Pacifico, Press Start 2P, Caveat (SIL Open Font License)
sw.js, manifest.webmanifest, icons/   installable app and offline support
vercel.json           hosting headers
```

## Browser notes

- Tested in Chrome (desktop and a phone-sized viewport) with a simulated camera, including touch drag and pinch.
- If the camera is blocked, the booth shows how to allow it and offers to use gallery photos instead.
- The Android share button only appears when the browser supports sharing files.
