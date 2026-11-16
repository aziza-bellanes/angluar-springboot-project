package com.sip.psm.config;

import com.sip.psm.entity.Role;
import com.sip.psm.entity.RoleName;
import com.sip.psm.entity.User;
import com.sip.psm.repository.RoleRepository;
import com.sip.psm.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
@Configuration public class BootstrapData {
@Bean CommandLineRunner seed(RoleRepository roles,UserRepository users,PasswordEncoder encoder,@Value("${psm.bootstrap.email}")String email,@Value("${psm.bootstrap.password}")String password){return args->{
for(RoleName name:RoleName.values())if(roles.findByLibelle(name).isEmpty())roles.save(new Role(name));
if(!email.isBlank()&&!users.existsByEmailIgnoreCase(email)){
if(password.length()<8)throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must contain at least 8 characters");
User u=new User();u.nom="Admin";u.prenom="PSM";u.email=email.toLowerCase(Locale.ROOT);u.password=encoder.encode(password);u.roles.add(roles.findByLibelle(RoleName.ADMIN).orElseThrow());users.save(u);}
};}
}
