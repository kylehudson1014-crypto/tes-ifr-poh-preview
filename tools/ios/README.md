# PPA IFR Lessons — iOS app (WKWebView wrapper)

The app bundles the whole Lessons web build (`../docs`) and serves it from `tesifr://app/`,
so lessons, visual lessons, narration audio and on-device logbook OCR work with no signal.
Sign-in and sync use Firebase project `tes-ifr-f5e73` when online.

## Build on the Mac Mini (Xcode 15 or newer)
1. Terminal:
   ```
   cd ~/Developer   # or any folder
   git clone https://github.com/kylehudson1014-crypto/tes-ifr-lessons.git
   open tes-ifr-lessons/ios/TESIFR.xcodeproj
   ```
2. In Xcode click the blue **TESIFR** project → target **TESIFR** → **Signing & Capabilities**:
   tick *Automatically manage signing*, pick your **Team** (your Apple ID / Tactical Edge team).
   If the bundle id `com.tacticaledge.tesifr` is taken, change it to anything unique.
3. Plug in the iPad (or pick an iPad simulator) in the device menu at the top, press **▶ Run**.
   First run on a real device: on the iPad open Settings → General → VPN & Device Management → trust your developer profile.
4. TestFlight later (needs the paid Apple Developer Program): Product → Archive → Distribute App.

## Updating the lessons inside the app
The app ships whatever is in `docs/` at build time. `git pull`, then Run again.

## If Xcode refuses to open the project
`brew install xcodegen && cd ios && xcodegen generate` rebuilds `TESIFR.xcodeproj` from `project.yml`.

## Debugging
iOS 16.4+: Safari on the Mac → Develop → (iPad) → TESIFR shows the web console.
