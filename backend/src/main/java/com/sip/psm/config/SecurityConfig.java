package com.sip.psm.config;

import com.sip.psm.security.JwtFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.List;
@Configuration public class SecurityConfig {
@Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder();}
@Bean SecurityFilterChain security(HttpSecurity http,JwtFilter jwt,@Value("${psm.cors.origin}") String origin)throws Exception{
return http.csrf(csrf->csrf.disable()).cors(cors->cors.configurationSource(req->{CorsConfiguration c=new CorsConfiguration();c.setAllowedOrigins(List.of(origin));c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Authorization","Content-Type"));return c;}))
.sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
.authorizeHttpRequests(auth->auth
.requestMatchers("/api/auth/register","/api/auth/login","/actuator/health").permitAll()
.requestMatchers(HttpMethod.GET,"/api/clients/**","/api/projets/**","/api/dashboard/**").hasAnyRole("ADMIN","COLLABORATEUR")
.requestMatchers(HttpMethod.POST,"/api/clients/**","/api/projets/**").hasAnyRole("ADMIN","COLLABORATEUR")
.requestMatchers("/api/admin/**").hasRole("ADMIN")
.requestMatchers("/api/**").authenticated().anyRequest().permitAll())
.exceptionHandling(e->e.authenticationEntryPoint((r,s,ex)->s.sendError(401,"Authentication required")).accessDeniedHandler((r,s,ex)->s.sendError(403,"Forbidden")))
.addFilterBefore(jwt,UsernamePasswordAuthenticationFilter.class).build();
}}
