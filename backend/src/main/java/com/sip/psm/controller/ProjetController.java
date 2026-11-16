package com.sip.psm.controller;

import com.sip.psm.entity.Projet;
import com.sip.psm.dto.ProjetDto;
import com.sip.psm.service.ProjetService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/projets") public class ProjetController {
private final ProjetService service;public ProjetController(ProjetService s){service=s;}
@GetMapping public List<Projet> list(){return service.list();}
@GetMapping("/{id}") public Projet get(@PathVariable Long id){return service.get(id);}
@PostMapping public ResponseEntity<Projet> create(@Valid @RequestBody ProjetDto d){return ResponseEntity.status(201).body(service.save(null,d));}
@PutMapping("/{id}") public Projet update(@PathVariable Long id,@Valid @RequestBody ProjetDto d,Authentication a){admin(a);return service.save(id,d);}
@DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id,Authentication a){admin(a);service.delete(id);return ResponseEntity.noContent().build();}
private void admin(Authentication a){if(a.getAuthorities().stream().noneMatch(x->x.getAuthority().equals("ROLE_ADMIN")))throw new org.springframework.security.access.AccessDeniedException("Admin only");}
}
