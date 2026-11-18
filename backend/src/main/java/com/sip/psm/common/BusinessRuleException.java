package com.sip.psm.common;

/**
 * Thrown when a request is well-formed but violates a domain rule
 * (duplicate email, bid too low, auction closed...). Mapped to HTTP 409.
 */
public class BusinessRuleException extends RuntimeException {

    private final String code;

    public BusinessRuleException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
