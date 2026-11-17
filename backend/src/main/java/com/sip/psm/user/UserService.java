package com.sip.psm.user;

import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.user.UserDtos.UserResponse;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Administration of user accounts and their roles. */
@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final RoleRepository roles;

    public UserService(UserRepository users, RoleRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return users.findAll(Sort.by("lastName", "firstName")).stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public User require(Long id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("User", id));
    }

    @Transactional(readOnly = true)
    public User requireByEmail(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("User", email));
    }

    public UserResponse updateRoles(Long id, Set<RoleName> requested, String actingEmail) {
        User user = require(id);
        if (user.getEmail().equalsIgnoreCase(actingEmail) && !requested.contains(RoleName.ADMIN)) {
            throw new BusinessRuleException("self_demotion", "You cannot remove your own administrator role");
        }
        user.setRoles(requested.stream().map(roles::require).collect(Collectors.toSet()));
        return UserResponse.from(user);
    }

    public UserResponse updateStatus(Long id, boolean enabled, String actingEmail) {
        User user = require(id);
        if (user.getEmail().equalsIgnoreCase(actingEmail) && !enabled) {
            throw new BusinessRuleException("self_disable", "You cannot disable your own account");
        }
        user.setEnabled(enabled);
        return UserResponse.from(user);
    }
}
