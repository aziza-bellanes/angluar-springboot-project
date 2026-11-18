package com.sip.psm.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class RoleDtos {
    private RoleDtos() {}

    public record RoleRequest(@NotBlank @Size(max = 32) String name, @NotNull RoleName profile) {
        public RoleRequest {
            if (name != null) name = name.trim();
        }
    }

    public record RoleResponse(Long id, String name, RoleName profile, boolean system, long userCount) {
        public static RoleResponse from(Role role, long userCount) {
            return new RoleResponse(role.getId(), role.getLibelle(), role.getProfile(),
                    role.getSystemKey() != null, userCount);
        }
    }
}
