package com.sip.psm.user;

import com.sip.psm.user.UserDtos.RolesUpdate;
import com.sip.psm.user.UserDtos.StatusUpdate;
import com.sip.psm.user.UserDtos.UserResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** User management, restricted to ADMIN by the security configuration. */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserService service;

    public AdminUserController(UserService service) {
        this.service = service;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<UserResponse> list() {
        return service.list();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/roles")
    public UserResponse updateRoles(@PathVariable Long id, @Valid @RequestBody RolesUpdate body, Principal principal) {
        return service.updateRoles(id, body.roles(), principal.getName());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/status")
    public UserResponse updateStatus(@PathVariable Long id, @RequestBody StatusUpdate body, Principal principal) {
        return service.updateStatus(id, body.enabled(), principal.getName());
    }
}
