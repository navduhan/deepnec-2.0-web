# Third-party notices

## S4PRED

The previous DeepNEC web implementation integrated [S4PRED](https://github.com/psipred/s4pred) for single-sequence secondary-structure prediction. Its source remains in the legacy `s4pred` submodule for attribution and migration history, but the Next.js 2.1 production application and Docker image do not build, download, or execute S4PRED.

S4PRED should be cited as: Moffat L and Jones DT (2021), “Increasing the accuracy of single sequence prediction methods using a deep semi-supervised learning framework,” *Bioinformatics* 37(21):3744–3751. https://doi.org/10.1093/bioinformatics/btab337

The first-party DeepNEC 2.0 Web code is distributed under the GNU General Public License, version 3.0 (`GPL-3.0-only`). S4PRED remains a separately attributed GPL-3.0 component; redistributors are responsible for satisfying its license terms and retaining its notices.

## Vendored browser utilities

`frontend/src/Components/Sstructure/getEmPixels.js` is the MIT-licensed getEmPixels utility by Tyson Matanich (2013); its original author and license notice are retained in the source file. `frontend/src/Components/Sstructure/color-palette.js` contains ColorBrewer palette data developed by Cynthia Brewer and Mark Harrower. These two vendored files intentionally retain their upstream attribution rather than a DeepNEC author header.
