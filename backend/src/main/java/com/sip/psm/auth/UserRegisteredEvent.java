package com.sip.psm.auth;

/** Published when a new account is created; consumed after the transaction commits. */
public record UserRegisteredEvent(Long userId, String fullName, String email) {
}
