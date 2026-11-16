package com.sip.psm.dto;

import jakarta.validation.constraints.*;
import java.util.*;
public final class AuthDtos {
private AuthDtos(){}
public record Register(@NotBlank String nom,@NotBlank String prenom,@NotBlank @Email String email,@NotBlank @Size(min=8) String password,String tel){}
public record Login(@NotBlank String email,@NotBlank String password){}
public record AuthResponse(String token,UserView user){}
public record UserView(Long id,String nom,String prenom,String email,String tel,Set<String> roles){}
public record RolesUpdate(@NotEmpty Set<String> roles){}
}
