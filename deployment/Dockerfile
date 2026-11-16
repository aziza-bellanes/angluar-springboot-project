FROM eclipse-temurin:17-jre
WORKDIR /app
COPY backend/target/psm.jar /app/psm.jar
ENV PORT=8080
EXPOSE 8080
USER 10001
ENTRYPOINT ["java","-jar","/app/psm.jar"]
