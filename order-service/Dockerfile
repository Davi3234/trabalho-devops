FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn -B -T 1C dependency:go-offline -q

ARG CACHEBUST=1
COPY src ./src

<<<<<<< HEAD
RUN mvn -B -T 1C package -Dmaven.test.skip=true -q

RUN java -Djarmode=layertools -jar target/*.jar extract
=======
RUN mvn package -Dmaven.test.skip=true -q
>>>>>>> origin/main

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

ARG IMAGE_TAG=unknown
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ENV DOCKER_IMAGE_TAG=${IMAGE_TAG}
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}

COPY --from=builder /app/dependencies/ ./dependencies/
COPY --from=builder /app/spring-boot-loader/ ./spring-boot-loader/
COPY --from=builder /app/snapshot-dependencies/ ./snapshot-dependencies/
COPY --from=builder /app/application/ ./application/

EXPOSE 8080

ENTRYPOINT ["java", "-cp", "spring-boot-loader/*:dependencies/*:snapshot-dependencies/*:application/*", "org.springframework.boot.loader.JarLauncher"]