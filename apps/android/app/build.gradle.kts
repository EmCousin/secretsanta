plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.secretsantadrawer.prototype"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.secretsantadrawer.prototype"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "0.1"
    }
    buildFeatures { buildConfig = true }
    buildTypes {
        debug {
            buildConfigField("String", "START_URL", "\"http://localhost:8765/\"")
        }
        release {
            buildConfigField("String", "START_URL", "\"https://secret-santa-drawer.com/\"")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("dev.hotwire:core:1.3.1")
    implementation("dev.hotwire:navigation-fragments:1.3.1")
}
