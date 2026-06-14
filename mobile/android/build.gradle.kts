allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    // Backfill a namespace for legacy plugins (e.g. vosk_flutter) that predate
    // AGP 8's requirement that every Android module declare a namespace.
    // Registered before evaluationDependsOn so it runs prior to evaluation.
    afterEvaluate {
        extensions.findByName("android")?.withGroovyBuilder {
            if (getProperty("namespace") == null) {
                setProperty("namespace", project.group.toString())
            }
            // vosk_flutter pins compileSdk 33, too low for its androidx deps.
            setProperty("compileSdkVersion", 36)
        }
    }
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
