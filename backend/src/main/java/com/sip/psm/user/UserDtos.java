package com.sip.psm.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Set;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(Long id, String firstName, String lastName, String email, String phone,
                               boolean enabled, Set<RoleName> roles, Set<Long> roleIds, Instant createdAt) {

        public static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(),
                    user.getPhone(), user.isEnabled(), user.roleNames(),
                    user.getRoles().stream().map(Role::getId).collect(java.util.stream.Collectors.toSet()), user.getCreatedAt());
        }
    }

    @ValidRoleSelection
    public record CreateUserRequest(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 190) String email,
            @Size(max = 30) @Pattern(regexp = "^[+0-9 ()-]*$", message = "must be a valid phone number") String phone,
            @NotBlank @Size(min = 8, max = 72) String password,
            Set<@NotNull RoleName> roles,
            Set<@NotNull @Positive Long> roleIds,
            Boolean enabled) implements RoleSelection {
    }

    /** Full update; a null or empty password keeps the current one. */
    @ValidRoleSelection
    public record UpdateUserRequest(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 190) String email,
            @Size(max = 30) @Pattern(regexp = "^[+0-9 ()-]*$", message = "must be a valid phone number") String phone,
            @Size(max = 72) String password,
            Set<@NotNull RoleName> roles,
            Set<@NotNull @Positive Long> roleIds,
            boolean enabled) implements RoleSelection {
    }

    public interface RoleSelection {
        Set<RoleName> roles();
        Set<Long> roleIds();
    }

    @ValidRoleSelection
    public record RolesUpdate(Set<@NotNull RoleName> roles,
                              Set<@NotNull @Positive Long> roleIds) implements RoleSelection {
    }

    public record StatusUpdate(boolean enabled) {
    }
}
