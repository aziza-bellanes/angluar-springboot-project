package com.sip.psm.user;

import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.user.RoleDtos.RoleRequest;
import com.sip.psm.user.RoleDtos.RoleResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RoleService {
    private final RoleRepository roles;
    private final UserRepository users;

    public RoleService(RoleRepository roles, UserRepository users) {
        this.roles = roles;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> list() {
        return roles.findAll(Sort.by("id")).stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse get(Long id) {
        return response(roles.findById(id).orElseThrow(() -> new NotFoundException("Role", id)));
    }

    public RoleResponse create(RoleRequest request) {
        checkName(request.name(), null, null);
        return save(new Role(request.name(), request.profile()));
    }

    public RoleResponse update(Long id, RoleRequest request) {
        Role role = requireLocked(id);
        checkName(request.name(), id, role.getSystemKey());
        if (role.getProfile() != request.profile()) {
            if (role.getSystemKey() != null) {
                throw new BusinessRuleException("system_role", "The permission profile of a system role cannot change");
            }
            if (users.countByRoleId(id) > 0) throw inUse();
        }
        role.update(request.name(), request.profile());
        return save(role);
    }

    public void delete(Long id) {
        Role role = requireLocked(id);
        if (role.getSystemKey() != null) {
            throw new BusinessRuleException("system_role", "System roles cannot be deleted");
        }
        if (users.countByRoleId(id) > 0) throw inUse();
        roles.delete(role);
        roles.flush();
    }

    private Role requireLocked(Long id) {
        return roles.lockById(id).orElseThrow(() -> new NotFoundException("Role", id));
    }

    private void checkName(String name, Long id, RoleName systemKey) {
        boolean reserved = Arrays.stream(RoleName.values())
                .anyMatch(key -> key.name().equalsIgnoreCase(name) && key != systemKey);
        if (reserved || roles.existsByLibelleIgnoreCaseAndIdNot(name, id == null ? -1L : id)) {
            throw nameTaken();
        }
    }

    private RoleResponse save(Role role) {
        try {
            return response(roles.saveAndFlush(role));
        } catch (DataIntegrityViolationException ex) {
            // The unique database constraint also covers concurrent creates and renames.
            throw nameTaken();
        }
    }

    private RoleResponse response(Role role) {
        return RoleResponse.from(role, users.countByRoleId(role.getId()));
    }

    private static BusinessRuleException nameTaken() {
        return new BusinessRuleException("role_name_taken", "This role name is already used or reserved");
    }

    private static BusinessRuleException inUse() {
        return new BusinessRuleException("role_in_use", "Unassign this role from all users before changing its profile or deleting it");
    }
}
