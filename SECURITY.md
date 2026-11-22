# Security

Flickora runs entirely in your browser. Photos are never uploaded, and the site has no backend, accounts or analytics.

## Reporting a problem

Please report security issues privately, not in a public issue. Use GitHub's **Report a vulnerability** button under the repository's **Security** tab, or email the owner through the contact link on their GitHub profile. Include the steps to reproduce it and the browser you used. You'll get a reply within a few days.

## What protects the site

- A strict Content-Security-Policy: only the site's own scripts, styles and fonts can run, and nothing can load from other sites.
- HTTPS only, no framing by other sites, and a Permissions-Policy that allows the camera for this site and switches off the microphone, location and other device access.
- Uploads are checked: images only, 30 MB and 100 megapixels at most per photo.
- Saved settings are validated when they load.
- Saved images are redrawn from scratch, so photo location data (EXIF) is never copied into a saved strip.
- Sharing a strip hands the image to the app you choose in your device's share sheet. After that, that app's own privacy rules apply.
