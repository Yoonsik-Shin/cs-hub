# syntax=docker/dockerfile:1.7

FROM gradle:8.7-jdk21-alpine AS build
WORKDIR /workspace

# Keep dependency resolution cacheable when only application sources change.
COPY settings.gradle.kts build.gradle.kts gradle.properties ./
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle dependencies --no-daemon --quiet

COPY src ./src
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

