package com.challenge.news_system.config;

import com.challenge.news_system.entity.User;
import com.challenge.news_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            log.info("Initializing SQLite database with user data from users.csv...");
            ClassPathResource resource = new ClassPathResource("users.csv");
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                
                String line;
                // Skip header line
                reader.readLine();
                
                List<User> users = new ArrayList<>();
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) {
                        continue;
                    }
                    List<String> fields = parseCsvLine(line);
                    if (fields.size() < 6) {
                        log.warn("Skipping malformed CSV line: {}", line);
                        continue;
                    }
                    
                    try {
                        Long no = Long.parseLong(fields.get(0));
                        String name = fields.get(1);
                        String deviceId = fields.get(2);
                        String pushType = fields.get(3);
                        String categories = fields.get(4);
                        String dndTime = fields.get(5);
                        
                        users.add(User.builder()
                                .id(no)
                                .name(name)
                                .deviceId(deviceId)
                                .pushType(pushType)
                                .categories(categories)
                                .dndTime(dndTime)
                                .build());
                    } catch (NumberFormatException e) {
                        log.error("Failed to parse user ID from line: {}", line, e);
                    }
                }
                
                userRepository.saveAll(users);
                log.info("Successfully loaded {} users into SQLite database.", users.size());
            } catch (Exception e) {
                log.error("Failed to seed database with users: ", e);
            }
        } else {
            log.info("User database already initialized. Skipped seeding.");
        }
    }

    private List<String> parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        result.add(sb.toString().trim());
        return result;
    }
}
