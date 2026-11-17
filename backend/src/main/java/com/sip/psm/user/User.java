package com.sip.psm.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.Setter;

/**
 * Specification entity User (id, email, password, tel, nom, prénom) with a Many-to-Many link to Role.
 */
@Getter
@Setter
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** prénom */
    @Column(name = "first_name", nullable = false, length = 80)
    private String firstName;

    /** nom */
    @Column(name = "last_name", nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false, unique = true, length = 190)
    private String email;

    /** BCrypt hash, never the raw password. */
    @Column(nullable = false, length = 100)
    private String password;

    /** tel */
    @Column(length = 30)
    private String phone;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Set<RoleName> roleNames() {
        return roles.stream().map(Role::getLibelle).collect(Collectors.toSet());
    }

    public boolean hasRole(RoleName role) {
        return roleNames().contains(role);
    }

    public String displayName() {
        return firstName + " " + lastName.charAt(0) + ".";
    }
}
