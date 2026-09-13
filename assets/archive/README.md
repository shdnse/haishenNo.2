# Personal archive UI

This is the static presentation layer used by `index个人简历.html`. No framework
build, remote CDN script, or third-party font is required. Existing game pages,
their sound systems, the original avatar, and all original certificate files
remain unchanged.

## Wallpaper source

- Workshop work: [荆棘1](https://steamcommunity.com/sharedfiles/filedetails/?id=3715870843)
- Workshop author: IMMORTAL
- Source: the user's locally installed copy of that Wallpaper Engine scene.
- Image dimensions: 2570 × 1434 for the main scene.

The images and soundtrack belong to their respective original creators. They
are not generated artwork and this repository does not claim authorship or
grant a new license for them. The homepage includes a visible source credit.

`scripts/import-wallpaper.py` reads the package as data and converts the original
texture layers into lossless WebP. It never runs scripts embedded in the package.
Browsers cannot run Wallpaper Engine scene packages directly: `archive.css`
recreates layer rotation, moving chains, glow, breathing and parallax. It does
not reproduce every proprietary shader, particle effect, or audio-reactive
deformation of the native Wallpaper Engine renderer. The original soundtrack
is optional and loads only after the visitor presses play.

## Certificates and motion

All ten original certificates and identifiers are retained. Nine PNG certificates
are re-encoded as lossless WebP without resizing; the original JPEG is reused.
`scripts/encode-certificates.py` asserts decoded RGB pixel equality. The viewer
always opens the untouched original files.

Two rows each contain five certificates plus an accessibility-hidden duplicate
for a continuous loop. Only transforms animate; images have no blur filter.
Images are loaded near the viewport with at most two concurrent decodes. Motion
pauses when the section is offscreen, when the page is hidden, while viewing an
original, or with the pause controls. Reduced-motion preferences are respected.

Contact glyphs are a visual interaction, not encryption or protection against
scraping. Real contact text remains accessible to assistive technology and is
available through mouse hover, keyboard focus, or touch. Phone/email links and
WeChat copying appear with the decoded information.
