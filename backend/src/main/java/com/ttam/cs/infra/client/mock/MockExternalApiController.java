package com.ttam.cs.infra.client.mock;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Profile({"dev", "local"})
@RestController
@RequestMapping("/api/external/mock")
public class MockExternalApiController {

    @GetMapping("/anti-abuse/check")
    public ResponseEntity<Map<String, Object>> checkAbusing(
            @RequestParam(name = "userCode", required = false) String userCode,
            @RequestParam(name = "delay", defaultValue = "0") long delay,
            @RequestParam(name = "fail", defaultValue = "false") boolean fail
    ) throws InterruptedException {
        if (delay > 0) {
            Thread.sleep(delay);
        }

        if (fail) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Mock External Server Error"));
        }

        boolean isAbuser = userCode != null && userCode.toLowerCase().contains("abuser");
        return ResponseEntity.ok(Map.of(
                "userCode", userCode != null ? userCode : "",
                "abusing", isAbuser
        ));
    }
}
