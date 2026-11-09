# Plan: split into a web Admin portal + an iOS Lessons app (no code moved yet)

**Today:** one offline PWA (index.html + sched/ v14/ v15/ modules). Training and School Admin are views in the same file, and the data lives in each device's localStorage. The Firebase project tes-ifr-f5e73 exists and is only used for optional sync.

## Two products
1. **School Admin portal (web).** New repo, e.g. `tes-admin-web`. It contains Scheduling, the resource timeline, Customer Accounts / packages, Fleet & squawks, the owner report, members/roles, the logbook review queue and the safety reports. Desktop-first, but it also works on an iPad. Hosting is Firebase Hosting or GitHub Pages.
2. **IFR Lessons app (iOS).** The TESIFR Xcode project (from 10/26). Phase 1 is a native shell (WKWebView) that bundles the Training side's files so it works fully offline: Lessons, Visual Lessons, Brief It, Aids, Oral, ACS and the student logbook. Phase 2 makes the heavy screens native one at a time (for example the instruments in SwiftUI/SpriteKit).

## Shared data path (one source of truth)
- Firebase Auth: one account per person, with a role claim (student / cfi / admin / owner).
- Firestore, keyed by `schools/{school}/…`: `members`, `bookings`, `aircraft`, `squawks`, `accounts` (packages, credit, ledger), `logbook` (entries plus their photo-review status), `progress` (lessons, quiz scores, visual-lesson completion) and `signoffs`.
- Security rules by role. Students read and write only their own progress and logbook. CFIs write sign-offs. Only admins write accounts and bookings for others.
- The app reads and writes the same collections, with Firestore offline persistence on so it keeps working without signal.

## What moves where
| Item | Admin web | iOS app |
|---|---|---|
| sched/ (timeline, bookings) | ✅ owner | read-only "my bookings" |
| v14/acct.js accounts | ✅ | student "My account" view |
| v14/logbook.js OCR | review queue | capture + mandatory review |
| Lessons, v15 Visual Lessons, Brief It, Aids, ACS, Oral | — | ✅ |
| Fleet / squawks / owner report | ✅ | report a squawk |

## Order of work
1. Freeze the data schemas (JSON shapes already used in localStorage) and write a migration script.
2. Write the Firestore rules and the emulator tests. Turn on Auth (email link or Apple sign-in).
3. Create the admin repo: lift the admin views and wire them to Firestore.
4. Build the iOS shell: bundle the training files, add sign-in and progress sync, then TestFlight once the Apple enrollment is active.
5. Keep this combined test copy running until both products pass. Then retire it.

## Needs Kyle's OK or money
- Apple Developer Program: $99/yr (enrollment pending). Required for TestFlight and the App Store.
- The Firebase free tier probably covers this. Cloud Functions, scheduled jobs or push notifications would need the Blaze plan (pay-as-you-go, card required).
- A custom domain for the admin portal (optional, about $10–20/yr).
- App Store privacy policy and support URL. Also, Apple sign-in is required if any other social login is offered.
- The school's real refund and package policy text. The current text is a placeholder.
- Any paid cloud OCR or vision service. Not used: OCR runs on the device.
