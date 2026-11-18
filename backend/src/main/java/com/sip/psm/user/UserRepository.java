package com.sip.psm.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("select count(distinct u) from User u join u.roles r where r.profile = :role and u.enabled = true")
    long countEnabledWithRole(@Param("role") RoleName role);
    @Query("select count(u) from User u join u.roles r where r.id = :roleId")
    long countByRoleId(@Param("roleId") Long roleId);
}
