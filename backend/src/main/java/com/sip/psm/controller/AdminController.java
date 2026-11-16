package com.sip.psm.controller;

import com.sip.psm.repository.*;
import com.sip.psm.entity.*;
import com.sip.psm.dto.AuthDtos.*;
import com.sip.psm.service.AuthService;
import com.sip.psm.exception.NotFoundException;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/admin") public class AdminController {
private final UserRepository users;private final RoleRepository roles;private final AuthService auth;
public AdminController(UserRepository u,RoleRepository r,AuthService a){users=u;roles=r;auth=a;}
@GetMapping("/users") public List<UserView> list(){return users.findAll().stream().map(auth::view).toList();}
@PutMapping("/users/{id}/roles") public UserView roles(@PathVariable Long id,@Valid @RequestBody RolesUpdate update){User user=users.findById(id).orElseThrow(()->new NotFoundException("User not found"));Set<Role> assigned=new HashSet<>();for(String name:update.roles()){RoleName role=RoleName.valueOf(name);assigned.add(roles.findByLibelle(role).orElseThrow());}user.roles=assigned;return auth.view(users.save(user));}
}
