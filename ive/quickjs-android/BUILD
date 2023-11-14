android_binary(
    name = "quickjs-android",
    manifest = "AndroidManifest.xml",
    deps = [
        ":applib",
    ],
)

android_library(
    name = "applib",
    srcs = [
        "Jni.java",
        "MainActivity.java",
    ],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        ":jni",
    ],
)

cc_library(
    name = "jni",
    srcs = ["com_app_jni.c"],
    deps = ["@quickjs"],
)
