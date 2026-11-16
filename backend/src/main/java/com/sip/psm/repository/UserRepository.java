package com.sip.psm.repository;

import com.sip.psm.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserRepository extends JpaRepository<User,Long> {
java.util.Optional<User> findByEmailIgnoreCase(String email);
boolean existsByEmailIgnoreCase(String email);
}
