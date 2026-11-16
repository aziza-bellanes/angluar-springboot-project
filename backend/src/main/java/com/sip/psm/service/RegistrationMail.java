package com.sip.psm.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.sip.psm.entity.User;
@Service public class RegistrationMail {
private final JavaMailSender sender;private final String admin;private final String from;
public RegistrationMail(JavaMailSender sender,@Value("${psm.admin.email}")String admin,@Value("${psm.mail.from}")String from){this.sender=sender;this.admin=admin;this.from=from;}
public void notifyAdmin(User u){SimpleMailMessage msg=new SimpleMailMessage();msg.setFrom(from);msg.setTo(admin);msg.setSubject("PSM — Nouvelle inscription");msg.setText("Nouvel utilisateur : "+u.prenom+" "+u.nom+" ("+u.email+")");
try{sender.send(msg);}catch(org.springframework.mail.MailException ex){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Registration saved, but admin notification failed: {}",ex.getMessage());}}
}
