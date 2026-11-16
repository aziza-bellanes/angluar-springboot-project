package com.sip.psm.controller;

import com.sip.psm.entity.Client;
import com.sip.psm.repository.*;
import com.sip.psm.exception.NotFoundException;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/clients") public class ClientController {
private final ClientRepository clients;private final ProjetRepository projects;
public ClientController(ClientRepository c,ProjetRepository p){clients=c;projects=p;}
@GetMapping public List<Client> list(){return clients.findAll();}
@GetMapping("/{id}") public Client get(@PathVariable Long id){return clients.findById(id).orElseThrow(()->new NotFoundException("Client not found"));}
@PostMapping public ResponseEntity<Client> create(@Valid @RequestBody Client c){c.id=null;return ResponseEntity.status(201).body(clients.save(c));}
@PutMapping("/{id}") public Client update(@PathVariable Long id,@Valid @RequestBody Client input,Authentication a){admin(a);Client c=get(id);c.nom=input.nom;c.email=input.email;c.tel=input.tel;c.adresse=input.adresse;return clients.save(c);}
@DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id,Authentication a){admin(a);Client c=get(id);if(projects.countByClientId(id)>0)throw new IllegalArgumentException("Cannot delete a client with projects");clients.delete(c);return ResponseEntity.noContent().build();}
private void admin(Authentication a){if(a.getAuthorities().stream().noneMatch(x->x.getAuthority().equals("ROLE_ADMIN")))throw new org.springframework.security.access.AccessDeniedException("Admin only");}
}
