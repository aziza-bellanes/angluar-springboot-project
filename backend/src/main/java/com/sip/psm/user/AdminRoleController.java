package com.sip.psm.user;

import com.sip.psm.user.UserDtos.RoleResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read access to the role catalogue, restricted to ADMIN by the security configuration. */
@RestController
@RequestMapping("/api/admin/roles")
public class AdminRoleController {

    private final UserService service;

    public AdminRoleController(UserService service) {
        this.service = service;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<RoleResponse> list() {
        return service.listRoles();
    }
}
