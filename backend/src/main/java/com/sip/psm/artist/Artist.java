package com.sip.psm.artist;

import com.sip.psm.common.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Specification equivalent of <b>Client</b> (id, nom, tel, email, adresse, photo, activité):
 * the gallery's client is the artist whose exhibitions and works ATELIER manages.
 */
@Getter
@Setter
@Entity
@Table(name = "artists")
public class Artist extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** nom */
    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 190)
    private String email;

    /** tel */
    @Column(length = 30)
    private String phone;

    /** adresse */
    @Column(length = 255)
    private String address;

    @Column(length = 80)
    private String country;

    @Column(length = 4000)
    private String biography;

    /** photo */
    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    /** activité */
    @Column(nullable = false)
    private boolean active = true;
}
