# syntax=docker/dockerfile:1.7
# Production image: builds the Angular app, packages it inside psm.jar (static/), runs on a JRE.

ARG NODE_VERSION=22.23.2
ARG JAVA_VERSION=17

FROM node:${NODE_VERSION}-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build -- --configuration production

FROM eclipse-temurin:${JAVA_VERSION}-jdk AS backend
WORKDIR /build/backend
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -B dependency:go-offline
COPY backend/src src
COPY --from=frontend /build/frontend/dist/atelier/browser/ src/main/resources/static/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -B -DskipTests package

FROM eclipse-temurin:${JAVA_VERSION}-jre AS runtime
RUN groupadd --system atelier && useradd --system --gid atelier --home /app atelier
WORKDIR /app
COPY --from=backend /build/backend/target/psm.jar psm.jar
USER atelier
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/psm.jar"]
