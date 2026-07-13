## pour android dans  : AndroidManifest.xml
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" />
    <uses-feature android:name="android.hardware.camera.autofocus" />

    <!-- Permet de prendre des photos avec l'appareil -->
    <uses-permission android:name="android.permission.CAMERA" />

    <!-- Permet d'accéder aux photos existantes (Android 13 et +) -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <!-- Permet d'accéder aux photos existantes (Anciennes versions d'Android) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

## pour iOS dans : Info.plist
    <key>NSCameraUsageDescription</key>
    <string>Nous avons besoin d'accéder à votre caméra pour scanner les QR codes des billets.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Nous avons besoin d'accéder à votre bibliothèque de photos pour scanner les QR codes des billets.</string>

    <key>NSCameraUsageDescription</key>
    <string>Nous avons besoin d'accéder à votre appareil photo pour prendre des photos.</string>
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>Nous avons besoin d'accéder à votre galerie pour enregistrer des photos.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Nous avons besoin d'accéder à votre galerie pour sélectionner des photos.</string>