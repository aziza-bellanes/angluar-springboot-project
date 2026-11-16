package com.sip.psm.service;

import com.sip.psm.entity.*;
import com.sip.psm.repository.*;
import com.sip.psm.dto.AuthDtos.*;
import com.sip.psm.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import java.util.*;
@Service public class AuthService {
private final UserRepository users;private final RoleRepository roles;private final PasswordEncoder encoder;private final JwtService jwt;private final RegistrationMail mail;
public AuthService(UserRepository u,RoleRepository r,PasswordEncoder e,JwtService j,RegistrationMail m){users=u;roles=r;encoder=e;jwt=j;mail=m;}
public UserView view(User u){return new UserView(u.id,u.nom,u.prenom,u.email,u.tel,u.roles.stream().map(r->r.libelle.name()).collect(java.util.stream.Collectors.toSet()));}
public AuthResponse register(Register input){if(users.existsByEmailIgnoreCase(input.email()))throw new IllegalArgumentException("Email already exists");
User u=new User();u.nom=input.nom();u.prenom=input.prenom();u.email=input.email().toLowerCase(Locale.ROOT).trim();u.password=encoder.encode(input.password());u.tel=input.tel();u.roles.add(roles.findByLibelle(RoleName.COLLABORATEUR).orElseThrow());users.save(u);mail.notifyAdmin(u);return new AuthResponse(jwt.issue(u.email),view(u));}
public AuthResponse login(Login input){User u=users.findByEmailIgnoreCase(input.email()).orElseThrow(()->new BadCredentialsException("Invalid credentials"));if(!encoder.matches(input.password(),u.password))throw new BadCredentialsException("Invalid credentials");return new AuthResponse(jwt.issue(u.email),view(u));}
public User require(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new BadCredentialsException("Invalid credentials"));}
}
