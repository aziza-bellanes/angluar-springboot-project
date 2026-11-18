package com.sip.psm.user;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findBySystemKey(RoleName systemKey);

    boolean existsByLibelleIgnoreCaseAndIdNot(String libelle, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Role r where r.id = :id")
    Optional<Role> lockById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Role r where r.systemKey = :key")
    Optional<Role> lockBySystemKey(@Param("key") RoleName key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Role r where r.id in :ids order by r.id")
    List<Role> lockByIds(@Param("ids") java.util.Set<Long> ids);

    default Role require(RoleName key) {
        return findBySystemKey(key)
                .orElseThrow(() -> new IllegalStateException("Role " + key + " is missing"));
    }
}
