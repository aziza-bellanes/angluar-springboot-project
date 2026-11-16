package com.sip.psm.repository;

import com.sip.psm.entity.Projet;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProjetRepository extends JpaRepository<Projet,Long> {
java.util.List<Projet> findByClientId(Long clientId); long countByClientId(Long clientId);
}
