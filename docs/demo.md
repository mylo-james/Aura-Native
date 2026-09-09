# A two-minute Aura demo

1. Open Aura and choose **Try Aura**. Explain that it creates a private temporary visitor session with 24 fictional moments.
2. Choose a mood. The original character responds with a short movement. Select an influence such as Sleep, then continue.
3. Add a fictional title and reflection. Visit Patterns and return to Check-in to show the draft is retained within the session. Save the moment.
4. Open the saved moment and reload. Edit its title, cancel once, then save an intentional change. The saved record survives reload.
5. Open Patterns and compare 7 and 30 days. Explain that these are check-in counts in the visitor's fixed timezone; influence percentages may overlap.
6. Delete the new moment with confirmation. Open About and reset the demo to restore the fictional starting set.

For an interview, explain the important implementation choices: shared native-compatible UI with semantic web controls, same-origin static/API hosting, per-visitor ownership, transaction-backed retry protection, optimistic editing versions, and timezone-correct summaries. Show the real tests and discuss the physical-device and public-hosting work still outstanding. Avoid claiming a native release or clinical effectiveness.

The six original character images are checked by `node scripts/check-assets.mjs`. All motion respects reduced-motion preferences. Saved demo records expire after 24 hours; unsaved drafts intentionally clear on full reload.
