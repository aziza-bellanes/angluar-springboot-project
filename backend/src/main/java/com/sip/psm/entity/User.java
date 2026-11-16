package com.sip.psm.entity;

import jakarta.persistence.*;
import java.util.*;
@Entity @Table(name="users") public class User {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
@Column(nullable=false) public String nom;
@Column(nullable=false) public String prenom;
@Column(nullable=false,unique=true) public String email;
@Column(nullable=false) public String password;
public String tel;
@ManyToMany(fetch=FetchType.EAGER) @JoinTable(name="user_roles",joinColumns=@JoinColumn(name="user_id"),inverseJoinColumns=@JoinColumn(name="role_id")) public Set<Role> roles = new HashSet<>();
}
