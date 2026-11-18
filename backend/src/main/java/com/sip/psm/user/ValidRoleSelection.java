package com.sip.psm.user;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidRoleSelection.Validator.class)
public @interface ValidRoleSelection {
    String message() default "Select at least one role";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<ValidRoleSelection, UserDtos.RoleSelection> {
        @Override
        public boolean isValid(UserDtos.RoleSelection value, ConstraintValidatorContext context) {
            if (value == null) return true;
            boolean useIds = value.roleIds() != null;
            var selection = useIds ? value.roleIds() : value.roles();
            if (selection != null && !selection.isEmpty()) return true;
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                    .addPropertyNode(useIds ? "roleIds" : "roles").addConstraintViolation();
            return false;
        }
    }
}
