package in.quickslot.identity;

import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "quickslot.demo-seed", havingValue = "true")
public class DemoSeed implements CommandLineRunner {
  private final JdbcTemplate jdbc;
  private final AuthService auth;
  private final Environment environment;

  public DemoSeed(JdbcTemplate jdbc, AuthService auth, Environment environment) {
    this.jdbc = jdbc;
    this.auth = auth;
    this.environment = environment;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (!environment.matchesProfiles("demo"))
      throw new IllegalStateException("Demo seeding requires the demo profile.");
    for (String role :
        new String[] {"FACULTY", "CLUB_HEAD", "COORDINATOR", "HOD", "ADMIN", "STUDENT"}) {
      String name = role.equals("CLUB_HEAD") ? "club" : role.toLowerCase(java.util.Locale.ROOT);
      jdbc.update(
          "INSERT INTO users(id,full_name,email,password_hash,role) VALUES (?,?,?,?,?) ON"
              + " CONFLICT(email) DO NOTHING",
          UUID.randomUUID().toString(),
          "Demo " + name,
          name + "@demo.quickslot.test",
          auth.passwordHash("QuickSlot-demo-2026!"),
          role);
    }
    for (String[] room :
        new String[][] {
          {"017", "CLASSROOM", "60"}, {"LT-101", "LT", "120"}, {"203", "CLASSROOM", "50"}
        }) {
      jdbc.update(
          "INSERT INTO rooms(id,code,kind,building,capacity) VALUES (?,?,?,?,?) ON"
              + " CONFLICT(campus_id,building,code) DO NOTHING",
          UUID.randomUUID().toString(),
          room[0],
          room[1],
          "Demo academic block",
          Integer.parseInt(room[2]));
    }
    jdbc.update(
        "INSERT INTO allocations(user_id,room_id) SELECT u.id,r.id FROM users u CROSS JOIN rooms r"
            + " WHERE u.email='coordinator@demo.quickslot.test' AND r.building='Demo academic"
            + " block' ON CONFLICT DO NOTHING");
  }
}
