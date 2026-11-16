package com.sip.psm.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
@Service public class JwtService {
private final Key key; private final long expiration;
public JwtService(@Value("${psm.jwt.secret}") String secret,@Value("${psm.jwt.expiration-ms}") long expiration){
if(secret==null || secret.getBytes(StandardCharsets.UTF_8).length<32) throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
this.key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));this.expiration=expiration;}
public String issue(String email){long now=System.currentTimeMillis();return Jwts.builder().subject(email).issuedAt(new Date(now)).expiration(new Date(now+expiration)).signWith(key).compact();}
public String subject(String token){return Jwts.parser().verifyWith((javax.crypto.SecretKey)key).build().parseSignedClaims(token).getPayload().getSubject();}
}
