plugins {
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
    id("java")
    id("org.graalvm.buildtools.native") version "0.10.2"
}

group = "com.ttam.cs"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testCompileOnly("org.projectlombok:lombok")
    testAnnotationProcessor("org.projectlombok:lombok")

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")

    runtimeOnly("org.postgresql:postgresql")

    // Querydsl (Jakarta)
    implementation("com.querydsl:querydsl-jpa:5.1.0:jakarta")
    annotationProcessor("com.querydsl:querydsl-apt:5.1.0:jakarta")
    annotationProcessor("jakarta.annotation:jakarta.annotation-api")
    annotationProcessor("jakarta.persistence:jakarta.persistence-api")

    // Resilience4j (Spring Boot 3)
    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.2.0")

    // Springdoc OpenAPI (Swagger)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.5.0")

    // Spring Boot Actuator & Prometheus Registry
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")

    // AWS SDK v2 for S3 (including S3Presigner)
    implementation("software.amazon.awssdk:s3:2.25.27")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("cs-api")
        }
    }
}


