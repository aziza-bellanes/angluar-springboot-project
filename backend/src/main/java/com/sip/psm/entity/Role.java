package com.sip.psm.entity;

import jakarta.persistence.*;
@Entity @Table(name="roles") public class Role {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
@Enumerated(EnumType.STRING) @Column(nullable=false,unique=true) public RoleName libelle;
public Role(){} public Role(RoleName name){this.libelle=name;}
}
