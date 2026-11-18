package com.sip.psm.account;

import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.user.User;
import com.sip.psm.user.UserDtos.UserResponse;
import com.sip.psm.user.UserService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lets every signed-in user maintain their own profile (CDC: User nom, prénom, tel) and password. */
@Service
@Transactional
public class ProfileService {

    public record ProfileUpdate(@NotBlank @Size(max = 80) String firstName,
                                @NotBlank @Size(max = 80) String lastName,
                                @Size(max = 30) @Pattern(regexp = "^[+0-9 ()-]*$") String phone) {
    }

    public record PasswordChange(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 100) String newPassword) {
    }

    private final UserService users;
    private final PasswordEncoder encoder;

    public ProfileService(UserService users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public UserResponse update(String email, ProfileUpdate update) {
        User user = users.requireByEmail(email);
        user.setFirstName(update.firstName().trim());
        user.setLastName(update.lastName().trim());
        user.setPhone(update.phone() == null || update.phone().isBlank() ? null : update.phone().trim());
        return UserResponse.from(user);
    }

    public void changePassword(String email, PasswordChange change) {
        User user = users.requireByEmail(email);
        if (!encoder.matches(change.currentPassword(), user.getPassword())) {
            throw new BusinessRuleException("wrong_password", "The current password is incorrect.");
        }
        user.setPassword(encoder.encode(change.newPassword()));
    }
}
