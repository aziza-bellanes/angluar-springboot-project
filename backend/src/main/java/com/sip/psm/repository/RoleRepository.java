package com.sip.psm.repository;

import com.sip.psm.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RoleRepository extends JpaRepository<Role,Long> {
java.util.Optional<Role> findByLibelle(com.sip.psm.entity.RoleName libelle);
}
