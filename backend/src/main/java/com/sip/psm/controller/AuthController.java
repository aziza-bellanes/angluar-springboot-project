package com.sip.psm.controller;

import com.sip.psm.dto.AuthDtos.*;
import com.sip.psm.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
@RestController @RequestMapping("/api/auth") public class AuthController {
private final AuthService service;public AuthController(AuthService s){service=s;}
@PostMapping("/register") ResponseEntity<AuthResponse> register(@Valid @RequestBody Register r){return ResponseEntity.status(201).body(service.register(r));}
@PostMapping("/login") AuthResponse login(@Valid @RequestBody Login r){return service.login(r);}
@GetMapping("/me") UserView me(Principal p){return service.view(service.require(p.getName()));}
}
