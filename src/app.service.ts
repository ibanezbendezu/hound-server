import { Injectable } from "@nestjs/common";
import { Dolos } from "./dolos";
import { GroupsService } from "./groups/groups.service";

@Injectable()
export class AppService {

    constructor(
        private group: GroupsService
    ) {
    }

    getHello(): string {
        return "Hello World!";
    }

    getProtectedResource(): string {
        return "Este es un recurso protegido";
    }

    async dolosTest() {
        const files = [
            {"path": "src/main/java/controllers/ClockController.java",
                "content": `package cl.tingeso.mueblesstgo.controllers;
                import cl.tingeso.mueblesstgo.services.ClockService;
                import cl.tingeso.mueblesstgo.services.HRMService;
                import org.springframework.stereotype.Controller;
                import org.springframework.web.bind.annotation.GetMapping;
                import org.springframework.web.bind.annotation.PostMapping;
                import org.springframework.web.bind.annotation.RequestParam;
                import org.springframework.web.multipart.MultipartFile;
                import org.springframework.web.servlet.mvc.support.RedirectAttributes;
    
                @Controller
                public class ClockController {
    
                    private final ClockService clockService;
                    private final HRMService hrmService;
    
                    public ClockController(ClockService clockService, HRMService hrmService) {
                        this.clockService = clockService;
                        this.hrmService = hrmService;
                    }
    
                    @GetMapping("/upload-clock")
                    public String upload() {
                        return "pages/upload-clock";
                    }
    
                    @PostMapping("/save-clock")
                    public String save(@RequestParam("file") MultipartFile file, RedirectAttributes ms){
                        if (this.clockService.loadClock(file)) {
                            try {
                                this.hrmService.generateWages();
                                ms.addFlashAttribute("success", "Reloj cargado correctamente.");
                                return "redirect:upload-clock";
                            } catch (Exception e) {
                                ms.addFlashAttribute("error", "Error al guardar el archivo.");
                                return "redirect:upload-clock";
                            }
                        } else {
                            ms.addFlashAttribute("error", "El archivo no posee el nombre correcto.");
                            return "redirect:upload-clock";
                        }
                    }
                }`
                        },
                        {"path": "src/main/java/web/WageController.java",
                            "content": `package com.test.one.web;
                import com.test.one.service.WageService;
                import org.springframework.stereotype.Controller;
                import org.springframework.ui.Model;
                import org.springframework.web.bind.annotation.GetMapping;
                import org.springframework.web.bind.annotation.PathVariable;
                import org.springframework.web.bind.annotation.RequestMapping;
    
                @Controller
                @RequestMapping("wage-view")
                public class WageController {
    
                    private final WageService service;
    
                    public WageController(WageService service) {
                        this.service = service;
                    }
    
                    @GetMapping("{id}")
                    public String showById(@PathVariable Long id, Model model){
                        model.addAttribute("wage", this.service.getById(id, Boolean.TRUE));
                        return "wage";
                    }
                }`
            }
        ];
        
        const dolos = new Dolos();
        const report = await dolos.analyzeFromString(files);
    
        for (const pair of report.allPairs()) {
            console.log(`Pair: ${pair.leftFile.path} vs ${pair.rightFile.path}`);
            console.log("similarity: " + pair.similarity);
            console.log("longest fragment: " + pair.longest);
            console.log("total overlap: " + pair.overlap);
            console.log("number of fragments: " + pair.buildFragments().length);
            console.log("--------------------------------------------------");
            let index = 0;
            for (const fragment of pair.buildFragments()) {
                const left = fragment.leftSelection;
                const right = fragment.rightSelection;
                console.log(`${pair.leftFile.path}:{${left.startRow},${left.startCol} -> ${left.endRow},${left.endCol}} matches with ${pair.rightFile.path}:{${right.startRow},${right.startCol} -> ${right.endRow},${right.endCol}}`);
                index++;
                console.log("/n");
            }
            console.log("--------------------------------------------------");
        }
    }

    async comparisonTestService() {
        const username = "ibanezbendezu";
        const repos = [
            /* { owner: "ibanezbendezu", name: "tttest" },
            { owner: "ibanezbendezu", name: "tttest2" },
            { owner: "ibanezbendezu", name: "tttest3" }, */
            { owner: "ibanezbendezu", name: "tingeso-mono-test" },
            { owner: "ibanezbendezu", name: "tingeso-ev1-g" },
            /* { owner: "holYadio", name: "TingesoPEP1" },
            { owner: "HolYadio", name: "tingesoPEP2-AcopioService" },
            { owner: "HolYadio", name: "tingesoPEP2-ProveedorService" },
            { owner: "HolYadio", name: "tingesoPEP2-PlanillaPagosService" },
            { owner: "HolYadio", name: "tingesoPEP2-LaboratorioService" },
            { owner: "paburto", name: "Tingeso" },
            { owner: "Vanina11", name: "mueblesstgo" },
            { owner: "acientgear", name: "tingeso" },
            { owner: "CatalinaOlivares", name: "Tingeso1" },
             
            { owner: "Issipisi", name: "Proyecto1_Tingeso" }, */
        ];
        
        const results = await this.group.createGroup(repos, username);

        return results;
    }
}
