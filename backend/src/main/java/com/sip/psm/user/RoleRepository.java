package com.sip.psm.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByLibelle(RoleName libelle);

    default Role require(RoleName libelle) {
        return findByLibelle(libelle)
                .orElseThrow(() -> new IllegalStateException("Role " + libelle + " is missing"));
    }
}
