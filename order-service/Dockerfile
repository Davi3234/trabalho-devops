FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -q

ARG CACHEBUST=1
COPY src ./src

RUN mvn package -Dmaven.test.skip=true -q

FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

ARG IMAGE_TAG=unknown
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ENV DOCKER_IMAGE_TAG=${IMAGE_TAG}
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]