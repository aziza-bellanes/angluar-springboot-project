package com.sip.psm.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A named role delegates permissions to a fixed security profile. */
@Getter
@Entity
@Table(name = "roles")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String libelle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RoleName profile;

    @Enumerated(EnumType.STRING)
    @Column(name = "system_key", unique = true, length = 32)
    private RoleName systemKey;

    public Role(RoleName libelle) {
        this.libelle = libelle.name();
        this.profile = libelle;
        this.systemKey = libelle;
    }
    public Role(String name, RoleName profile) {
        this.libelle = name.trim();
        this.profile = profile;
    }

    public void update(String name, RoleName profile) {
        this.libelle = name.trim();
        this.profile = profile;
    }
}
