package com.sip.psm.service;

import com.sip.psm.entity.*;
import com.sip.psm.dto.ProjetDto;
import com.sip.psm.repository.*;
import com.sip.psm.exception.NotFoundException;
import org.springframework.stereotype.Service;
import java.util.*;
@Service public class ProjetService {
private final ProjetRepository projects;private final ClientRepository clients;
public ProjetService(ProjetRepository p,ClientRepository c){projects=p;clients=c;}
public Projet get(Long id){return projects.findById(id).orElseThrow(()->new NotFoundException("Projet not found"));}
public List<Projet> list(){return projects.findAll();}
public Projet save(Long id,ProjetDto d){if(d.dateDebut()!=null&&d.dateFin()!=null&&d.dateFin().isBefore(d.dateDebut()))throw new IllegalArgumentException("End date must not precede start date");
Projet p=id==null?new Projet():get(id);p.libelle=d.libelle();p.description=d.description();p.budget=d.budget();p.duree=d.duree();p.dateDebut=d.dateDebut();p.dateFin=d.dateFin();p.statut=d.statut();p.progression=d.progression();p.client=clients.findById(d.clientId()).orElseThrow(()->new NotFoundException("Client not found"));return projects.save(p);}
public void delete(Long id){projects.delete(get(id));}
}
