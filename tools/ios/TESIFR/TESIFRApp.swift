import SwiftUI

/// TES IFR Lessons — native shell around the offline IFR Lessons web build.
/// The web files are bundled in the app (folder reference "docs"), served from tesifr://app/
/// by AppSchemeHandler, so every lesson, visual lesson, audio narration and the on-device
/// logbook OCR work with no connection. Sign-in and sync talk to Firebase (tes-ifr-f5e73) when online.
@main
struct TESIFRApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
