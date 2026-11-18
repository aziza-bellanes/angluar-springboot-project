package com.sip.psm.user;

import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.common.NotFoundException;
import com.sip.psm.artist.ArtistRepository;
import com.sip.psm.artwork.ArtworkRepository;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.auction.BidRepository;
import com.sip.psm.exhibition.ExhibitionRepository;
import com.sip.psm.user.UserDtos.CreateUserRequest;
import com.sip.psm.user.UserDtos.RoleSelection;
import com.sip.psm.user.UserDtos.RolesUpdate;
import com.sip.psm.user.UserDtos.UpdateUserRequest;
import com.sip.psm.user.UserDtos.UserResponse;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Administration of user accounts and their roles. */
@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final RoleRepository roles;

    private final PasswordEncoder passwordEncoder;
    private final BidRepository bids;
    private final AuctionRepository auctions;
    private final ArtistRepository artists;
    private final ExhibitionRepository exhibitions;
    private final ArtworkRepository artworks;

    public UserService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
                       BidRepository bids, AuctionRepository auctions, ArtistRepository artists,
                       ExhibitionRepository exhibitions, ArtworkRepository artworks) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.bids = bids;
        this.auctions = auctions;
        this.artists = artists;
        this.exhibitions = exhibitions;
        this.artworks = artworks;
    }

    public UserResponse create(CreateUserRequest request) {
        String email = normalize(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw emailTaken();
        }
        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setEnabled(request.enabled() == null || request.enabled());
        user.setRoles(resolve(request));
        return UserResponse.from(users.save(user));
    }

    public UserResponse update(Long id, UpdateUserRequest request, String actingEmail) {
        lockAdminInvariant();
        User user = require(id);
        Set<Role> requested = resolve(request);
        boolean willBeAdmin = hasAdminProfile(requested);
        String email = normalize(request.email());
        if (users.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw emailTaken();
        }
        boolean self = user.getEmail().equalsIgnoreCase(actingEmail);
        if (self && !willBeAdmin) {
            throw new BusinessRuleException("self_demotion", "You cannot remove your own administrator role");
        }
        if (self && !request.enabled()) {
            throw new BusinessRuleException("self_disable", "You cannot disable your own account");
        }
        if (isEnabledAdmin(user) && (!willBeAdmin || !request.enabled())) {
            requireAnotherAdmin();
        }
        if (request.password() != null && !request.password().isEmpty()) {
            if (request.password().length() < 8) {
                throw new BusinessRuleException("password_too_short", "The password must contain at least 8 characters");
            }
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setEnabled(request.enabled());
        user.setRoles(requested);
        return UserResponse.from(user);
    }

    /** Deletes an account that has no recorded activity; accounts with history must be disabled instead. */
    public void delete(Long id, String actingEmail) {
        lockAdminInvariant();
        User user = require(id);
        if (user.getEmail().equalsIgnoreCase(actingEmail)) {
            throw new BusinessRuleException("cannot_delete_self", "You cannot delete your own account");
        }
        if (isEnabledAdmin(user)) {
            requireAnotherAdmin();
        }
        if (bids.existsByBidderId(id) || auctions.existsByWinnerIdOrLeadingBidderId(id, id)
                || artists.existsByCreatedById(id) || exhibitions.existsByCreatedById(id)
                || artworks.existsByCreatedById(id)) {
            throw new BusinessRuleException("user_has_activity",
                    "This user has bids or created content and cannot be deleted; disable the account instead");
        }
        users.delete(user);
    }

    private boolean isEnabledAdmin(User user) {
        return user.isEnabled() && user.hasRole(RoleName.ADMIN);
    }

    private void requireAnotherAdmin() {
        if (users.countEnabledWithRole(RoleName.ADMIN) <= 1) {
            throw new BusinessRuleException("last_admin", "At least one enabled administrator must remain");
        }
    }

    private Set<Role> resolve(RoleSelection selection) {
        Set<Long> ids = selection.roleIds();
        if (ids == null) {
            if (selection.roles() == null || selection.roles().isEmpty()) {
                throw new IllegalArgumentException("Select at least one role");
            }
            ids = selection.roles().stream().map(roles::require).map(Role::getId).collect(Collectors.toSet());
        }
        if (ids.isEmpty() || ids.contains(null)) throw new IllegalArgumentException("Select at least one valid role");
        List<Role> selected = roles.lockByIds(ids);
        if (selected.size() != ids.size()) {
            throw new BusinessRuleException("unknown_role", "One or more selected roles no longer exist");
        }
        return new java.util.HashSet<>(selected);
    }

    private static boolean hasAdminProfile(Set<Role> selected) {
        return selected.stream().anyMatch(role -> role.getProfile() == RoleName.ADMIN);
    }

    // Serialize account mutations that can remove the final administrator, including custom ADMIN profiles.
    private void lockAdminInvariant() {
        roles.lockBySystemKey(RoleName.ADMIN).orElseThrow();
    }

    private static BusinessRuleException emailTaken() {
        return new BusinessRuleException("email_taken", "An account already exists for this email");
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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

    public UserResponse updateRoles(Long id, RolesUpdate selection, String actingEmail) {
        lockAdminInvariant();
        User user = require(id);
        Set<Role> requested = resolve(selection);
        boolean willBeAdmin = hasAdminProfile(requested);
        if (user.getEmail().equalsIgnoreCase(actingEmail) && !willBeAdmin) {
            throw new BusinessRuleException("self_demotion", "You cannot remove your own administrator role");
        }
        if (isEnabledAdmin(user) && !willBeAdmin) {
            requireAnotherAdmin();
        }
        user.setRoles(requested);
        return UserResponse.from(user);
    }

    public UserResponse updateStatus(Long id, boolean enabled, String actingEmail) {
        lockAdminInvariant();
        User user = require(id);
        if (user.getEmail().equalsIgnoreCase(actingEmail) && !enabled) {
            throw new BusinessRuleException("self_disable", "You cannot disable your own account");
        }
        if (!enabled && isEnabledAdmin(user)) {
            requireAnotherAdmin();
        }
        user.setEnabled(enabled);
        return UserResponse.from(user);
    }
}
