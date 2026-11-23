# Offline PDF assets

Embedded by `../build.cjs`; no runtime requests for scripts or fonts.

- pdf-lib 1.17.1: bundled runtime package, MIT, see pdf-lib-LICENSE.md.
- @pdf-lib/fontkit 1.1.1: official npm registry tarball (shasum f18473892b65e3253eb73f4569785abd2c03b1e0), MIT; upstream documentation/license link in fontkit-README.md. UMD retains upstream notices.
- Liberation Sans Regular and Bold 2.1.5: full bundled LibreOffice fonts (SIL OFL); see LICENSE_LIBERATION. Replaced the reduced pdfjs-dist variants on 23.11.2026 to retain Kazakh Cyrillic, including Қ in official source names. Same font family and weights.

Do not replace with CDN URLs. Embedded/subset fonts provide searchable Cyrillic PDF text.
