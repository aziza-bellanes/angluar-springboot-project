package com.sip.psm.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
@Controller public class SpaController {
@GetMapping(value={"/","/login","/register","/dashboard","/clients","/projets","/utilisateurs"})
public String index(){return "forward:/index.html";}
}
