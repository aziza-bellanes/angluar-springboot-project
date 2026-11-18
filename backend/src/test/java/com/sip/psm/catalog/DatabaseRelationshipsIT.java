package com.sip.psm.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import com.sip.psm.artist.Artist;
import com.sip.psm.exhibition.Exhibition;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.RoleRepository;
import com.sip.psm.user.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Verifies the CDC cardinalities after flushing and reloading from real MySQL. */
@IntegrationTest
@Transactional
class DatabaseRelationshipsIT {

    @Autowired TestFixtures fixtures;
    @Autowired RoleRepository roles;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbc;

    @Test
    void usersCanShareRolesAndOneUserCanHaveSeveralRoles() {
        User first = fixtures.user(RoleName.COLLABORATEUR);
        first.getRoles().add(roles.require(RoleName.BIDDER));
        User second = fixtures.user(RoleName.COLLABORATEUR);
        entityManager.flush();
        entityManager.clear();

        assertThat(entityManager.find(User.class, first.getId()).roleNames())
                .containsExactlyInAnyOrder(RoleName.COLLABORATEUR, RoleName.BIDDER);
        assertThat(entityManager.find(User.class, second.getId()).roleNames())
                .containsExactly(RoleName.COLLABORATEUR);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                WHERE r.libelle = 'COLLABORATEUR' AND ur.user_id IN (?, ?)
                """, Integer.class, first.getId(), second.getId())).isEqualTo(2);
    }

    @Test
    void oneArtistHasSeveralExhibitionsAndEachExhibitionHasOneArtist() {
        Artist artist = fixtures.artist();
        Exhibition first = fixtures.exhibition(artist);
        Exhibition second = fixtures.exhibition(artist);
        entityManager.flush();
        entityManager.clear();

        Artist reloaded = entityManager.find(Artist.class, artist.getId());
        assertThat(reloaded.getExhibitions()).extracting(Exhibition::getId)
                .containsExactlyInAnyOrder(first.getId(), second.getId());
        assertThat(entityManager.find(Exhibition.class, first.getId()).getArtist().getId())
                .isEqualTo(artist.getId());
        assertThat(entityManager.find(Exhibition.class, second.getId()).getArtist().getId())
                .isEqualTo(artist.getId());
    }
}
