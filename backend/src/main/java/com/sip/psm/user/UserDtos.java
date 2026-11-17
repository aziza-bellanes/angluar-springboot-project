package com.sip.psm.user;

import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.Set;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(Long id, String firstName, String lastName, String email, String phone,
                               boolean enabled, Set<RoleName> roles, Instant createdAt) {

        public static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(),
                    user.getPhone(), user.isEnabled(), user.roleNames(), user.getCreatedAt());
        }
    }

    public record RolesUpdate(@NotEmpty Set<RoleName> roles) {
    }

    public record StatusUpdate(boolean enabled) {
    }
}
