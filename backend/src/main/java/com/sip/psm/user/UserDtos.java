package com.sip.psm.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    public record CreateUserRequest(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 190) String email,
            @Size(max = 30) @Pattern(regexp = "^[+0-9 ()-]*$", message = "must be a valid phone number") String phone,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotEmpty Set<RoleName> roles,
            Boolean enabled) {
    }

    /** Full update; a null or empty password keeps the current one. */
    public record UpdateUserRequest(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 190) String email,
            @Size(max = 30) @Pattern(regexp = "^[+0-9 ()-]*$", message = "must be a valid phone number") String phone,
            @Size(max = 72) String password,
            @NotEmpty Set<RoleName> roles,
            boolean enabled) {
    }

    public record RoleResponse(Long id, RoleName name) {

        public static RoleResponse from(Role role) {
            return new RoleResponse(role.getId(), role.getLibelle());
        }
    }

    public record RolesUpdate(@NotEmpty Set<RoleName> roles) {
    }

    public record StatusUpdate(boolean enabled) {
    }
}
