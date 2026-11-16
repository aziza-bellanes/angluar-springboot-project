package com.sip.psm.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;
import com.sip.psm.repository.UserRepository;
import java.io.IOException;
@Component public class JwtFilter extends OncePerRequestFilter {
private final JwtService jwt;private final UserRepository users;
public JwtFilter(JwtService jwt,UserRepository users){this.jwt=jwt;this.users=users;}
@Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
String h=req.getHeader("Authorization");
if(h!=null && h.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication()==null){
try{String email=jwt.subject(h.substring(7));users.findByEmailIgnoreCase(email).ifPresent(u->{var authorities=u.roles.stream().map(role->new SimpleGrantedAuthority("ROLE_"+role.libelle.name())).toList();SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(u.email,null,authorities));});}catch(Exception ignored){}
}chain.doFilter(req,res);
}}
