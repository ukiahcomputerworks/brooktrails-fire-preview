# Walking-stick continuity — 2026-10-02

Built-in image-generation edit mode was used to correct the two walking-pose assets. The first and third animation frames reuse the right-step asset. The fourth retains the existing planted pose. Originals remain preserved for rollback.

Final project assets:
- `assets/images/trail-hiker-left-stick.png`
- `assets/images/trail-hiker-right-stick.png`
- Existing final pose: `assets/images/trail-hiker-summit.png`

## Final prompt (both edits)

Use case: precise-object-edit. Image 1 is edit target, image 2 supporting reference for walking stick. Preserve image 1 exactly: same woman, identity, cap, backpack, clothes, lighting, framing, dimensions and stepping legs. Add ONLY the exact wooden/brown trekking walking stick with black handle, wrist strap and collars from image 2 into her RIGHT hand (on viewer right), adjusting fingers minimally to naturally grip it. She is carrying it during a step, angled slightly forward to the right with its rubber tip visibly lifted above ground, NOT planted. Full stick visible from handle to tip, no duplicate stick or extra limb. Preserve genuine transparent alpha background, no backdrop, text, shadow scenery, or border. This must match the final planted reference, not appear as a different object.

## Verification

`verify-hiker-stick.cjs` captures each of the four animation poses at 390, 1080, and 1440 px. Phone renders were visually inspected: the stick is visible throughout all four poses and is carried above the ground during the walking sequence. Existing timing, replay, reduced-motion fallback, and all three sign links are retained.
