---
"eventstormer": patch
---

Gate `sonarjs/cognitive-complexity` at 15 (not the recommended preset) and split
the Session/Proposal deciders and `deriveTracks` into per-command helpers so
exhaustive union folds stay legal without a domain carve-out.
