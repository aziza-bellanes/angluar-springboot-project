package com.sip.psm.controller;

import com.sip.psm.repository.*;
import com.sip.psm.entity.*;
import org.springframework.web.bind.annotation.*;
import java.math.*;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/api/dashboard") public class DashboardController {
private final ClientRepository clients;private final ProjetRepository projects;
public DashboardController(ClientRepository c,ProjetRepository p){clients=c;projects=p;}
@GetMapping("/stats") public Map<String,Object> stats(){List<Projet> all=projects.findAll();LocalDate today=LocalDate.now();
long completed=all.stream().filter(p->p.statut==ProjectStatus.TERMINE).count();long active=all.stream().filter(p->p.statut==ProjectStatus.EN_COURS).count();long late=all.stream().filter(p->p.statut!=ProjectStatus.TERMINE&&p.dateFin!=null&&p.dateFin.isBefore(today)).count();
BigDecimal total=all.stream().map(p->p.budget).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add);
List<Projet> recent=all.stream().sorted(Comparator.comparing((Projet p)->p.id).reversed()).limit(5).toList();
Map<String,Object> s=new LinkedHashMap<>();s.put("clients",clients.count());s.put("projets",all.size());s.put("enCours",active);s.put("termines",completed);s.put("enRetard",late);s.put("budgetTotal",total);s.put("recents",recent);return s;}
}
