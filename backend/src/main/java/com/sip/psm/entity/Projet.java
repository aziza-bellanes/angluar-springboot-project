package com.sip.psm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@Entity @Table(name="projets") public class Projet {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
@NotBlank public String libelle;
@Column(length=3000) public String description;
@NotNull @DecimalMin("0.0") @Column(precision=14,scale=2) public BigDecimal budget;
@Min(0) public Integer duree;
public LocalDate dateDebut;
public LocalDate dateFin;
@Enumerated(EnumType.STRING) @Column(nullable=false) public ProjectStatus statut=ProjectStatus.A_FAIRE;
@Min(0) @Max(100) public Integer progression=0;
@ManyToOne(fetch=FetchType.EAGER,optional=false) @JoinColumn(name="client_id",nullable=false) public Client client;
}
