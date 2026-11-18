package com.sip.psm.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.MySQLContainer;

/** A real MySQL 8.4 so Flyway migrations, constraints and row locks are tested as in production. */
@TestConfiguration(proxyBeanMethods = false)
public class MySqlTestContainer {

    @Bean
    @ServiceConnection
    MySQLContainer<?> mysql() {
        return new MySQLContainer<>("mysql:8.4.13").withReuse(false);
    }
}
