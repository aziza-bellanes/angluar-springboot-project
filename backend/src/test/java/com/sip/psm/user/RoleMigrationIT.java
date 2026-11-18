package com.sip.psm.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Exercises the production upgrade path against a populated V2 database, including existing foreign keys. */
@Testcontainers
class RoleMigrationIT {
    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.13");

    @Test
    void upgradePreservesRoleIdsAndUserAssignmentsAndPopulatesStableProfiles() throws Exception {
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .target(MigrationVersion.fromVersion("2")).load().migrate();
        try (Connection connection = DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
             Statement sql = connection.createStatement()) {
            sql.executeUpdate("INSERT INTO roles (id, libelle) VALUES (17,'ADMIN'), (23,'COLLABORATEUR'), (41,'BIDDER')");
            sql.executeUpdate("INSERT INTO users (id,first_name,last_name,email,password) VALUES (101,'Existing','Admin','legacy@test.local','hash')");
            sql.executeUpdate("INSERT INTO user_roles (user_id,role_id) VALUES (101,17),(101,23)");
        }
        var migrated = Flyway.configure().dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword()).load().migrate();
        assertThat(migrated.migrationsExecuted).isEqualTo(1);
        try (Connection connection = DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
             Statement sql = connection.createStatement()) {
            try (ResultSet result = sql.executeQuery("SELECT id,libelle,profile,system_key FROM roles ORDER BY id")) {
                for (var expected : new String[][]{{"17","ADMIN"},{"23","COLLABORATEUR"},{"41","BIDDER"}}) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString("id")).isEqualTo(expected[0]);
                    assertThat(result.getString("libelle")).isEqualTo(expected[1]);
                    assertThat(result.getString("profile")).isEqualTo(expected[1]);
                    assertThat(result.getString("system_key")).isEqualTo(expected[1]);
                }
                assertThat(result.next()).isFalse();
            }
            try (ResultSet result = sql.executeQuery("SELECT user_id,role_id FROM user_roles ORDER BY role_id")) {
                for (long roleId : new long[]{17,23}) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getLong("user_id")).isEqualTo(101);
                    assertThat(result.getLong("role_id")).isEqualTo(roleId);
                }
                assertThat(result.next()).isFalse();
            }
            sql.executeUpdate("UPDATE roles SET libelle='Gallery directors' WHERE id=17");
            sql.executeUpdate("INSERT INTO roles(libelle,profile) VALUES('Guest curators','COLLABORATEUR')");
            try (ResultSet result = sql.executeQuery("SELECT system_key,profile FROM roles WHERE id=17")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString("system_key")).isEqualTo("ADMIN");
                assertThat(result.getString("profile")).isEqualTo("ADMIN");
            }
        }
    }
}
