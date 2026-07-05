package com.ttam.cs.infra.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DocRedirectController {
    @GetMapping("/docs")
    public String redirectToDocs() {
        return "redirect:/docs/index.html";
    }
}
