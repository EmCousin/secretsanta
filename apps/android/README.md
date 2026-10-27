# Android Hotwire Native experiment

This is a first prototype, not a release build. The debug APK compiles, but the app has not been run on a device and offline use is unverified. It opens the published site in a Hotwire Native shell; it does not yet register app links or add a native share bridge. Until the matching web change is deployed, the published site does not load Turbo for Hotwire and the prototype cannot be expected to work.

Builds require an Android SDK (API 35), Java 17, Gradle compatible with Android Gradle Plugin 8.13.2, and network access for build dependencies. Install and license those tools separately; no SDK, Gradle wrapper, keystore or signing credentials are included. From this directory, run `gradle :app:assembleDebug` in a properly configured environment. The application ID is provisional and must be chosen before any release or verified App Links setup.

Before considering this usable, test on a real Android device: initial online launch, later offline launch and draws, explicit save/restore, language changes, browser-compatible fragment invitations, share/copy fallbacks, process restart, and external navigation. Do not log personal data or invitation URLs. The web and native WebView may have separate local storage. iOS needs a separate implementation and a Mac with Xcode. None of these checks have been run.
