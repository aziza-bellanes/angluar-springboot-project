package com.sip.psm.security;

import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Secures the STOMP channel for stateless JWT clients:
 * <ul>
 *   <li>CONNECT may carry {@code Authorization: Bearer ...}; an invalid token is rejected,
 *       no token means an anonymous (read-only) connection.</li>
 *   <li>SUBSCRIBE is limited to the public {@code /topic/auctions} destinations.</li>
 *   <li>SEND is refused: bids go through the validated REST endpoint only.</li>
 * </ul>
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String PUBLIC_TOPIC = "/topic/auctions";

    private final TokenAuthenticator authenticator;

    public StompAuthChannelInterceptor(TokenAuthenticator authenticator) {
        this.authenticator = authenticator;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) {
            String header = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
            if (header != null) {
                accessor.setUser(authenticator.authenticate(header)
                        .orElseThrow(() -> new MessageDeliveryException("Invalid or expired token")));
            }
        } else if (command == StompCommand.SUBSCRIBE) {
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith(PUBLIC_TOPIC)) {
                throw new MessageDeliveryException("Subscription to " + destination + " is not allowed");
            }
        } else if (command == StompCommand.SEND) {
            throw new MessageDeliveryException("Clients cannot send messages; use the REST API");
        }
        return message;
    }
}
