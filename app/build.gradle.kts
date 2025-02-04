plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.pelajaran.mentalhealth"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.pelajaran.mentalhealth"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {
    // https://mvnrepository.com/artifact/com.google.mediapipe/solution-core
    implementation(libs.solution.core)
    // https://mvnrepository.com/artifact/com.google.mediapipe/hands
    implementation(libs.mediapipe.hands)
    // https://mvnrepository.com/artifact/com.google.mediapipe/facemesh
    implementation(libs.mediapipe.facemesh)

    implementation (libs.camera.core)
    implementation (libs.camera.camera2)
    implementation (libs.camera.lifecycle)
    implementation (libs.androidx.camera.view)

    implementation (libs.androidx.lifecycle.runtime.ktx)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}