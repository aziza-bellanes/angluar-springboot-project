package com.sip.psm.exception;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.*;
@RestControllerAdvice public class ApiErrors {
@ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class) ResponseEntity<?> unauthorized(RuntimeException e){return ResponseEntity.status(401).body(Map.of("error","Invalid credentials"));}
@ExceptionHandler(org.springframework.security.access.AccessDeniedException.class) ResponseEntity<?> forbidden(RuntimeException e){return ResponseEntity.status(403).body(Map.of("error","Forbidden"));}
@ExceptionHandler(NotFoundException.class) ResponseEntity<?> notFound(NotFoundException e){return ResponseEntity.status(404).body(Map.of("error",e.getMessage()));}
@ExceptionHandler({IllegalArgumentException.class,DataIntegrityViolationException.class}) ResponseEntity<?> bad(RuntimeException e){return ResponseEntity.badRequest().body(Map.of("error",e.getMessage()==null?"Invalid request":e.getMessage()));}
@ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> invalid(MethodArgumentNotValidException e){return ResponseEntity.badRequest().body(Map.of("error","Validation failed","fields",e.getBindingResult().getFieldErrors().stream().map(x->x.getField()+": "+x.getDefaultMessage()).toList()));}
}
