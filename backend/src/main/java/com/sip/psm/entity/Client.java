package com.sip.psm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
@Entity @Table(name="clients") public class Client {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
@NotBlank public String nom;
@NotBlank @Email @Column(nullable=false) public String email;
public String tel;
public String adresse;
}
