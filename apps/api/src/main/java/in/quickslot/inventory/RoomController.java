package in.quickslot.inventory;

import in.quickslot.identity.AuthService;
import in.quickslot.shared.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
  private final RoomRepository rooms;
  private final JdbcTemplate jdbc;
  private final AuthService auth;
  private final AuditService audit;

  public RoomController(
      RoomRepository rooms, JdbcTemplate jdbc, AuthService auth, AuditService audit) {
    this.rooms = rooms;
    this.jdbc = jdbc;
    this.auth = auth;
    this.audit = audit;
  }

  public record RoomInput(
      @NotBlank @Size(max = 80) String code,
      @Pattern(regexp = "CLASSROOM|LT") @NotNull String kind,
      @NotBlank @Size(max = 100) String building,
      @Min(1) @Max(5000) int capacity) {}

  public static Map<String, ?> publicView(Room room) {
    var result = new LinkedHashMap<String, Object>();
    result.put("id", room.id());
    result.put("code", room.code());
    result.put("kind", room.kind());
    result.put("building", room.building());
    result.put("capacity", room.capacity());
    result.put("source_label", room.sourceLabel());
    return result;
  }

  @GetMapping
  public List<?> list() {
    return rooms.publicRooms().stream().map(RoomController::publicView).toList();
  }

  @PostMapping
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  @Transactional
  public Map<String, ?> create(@Valid @RequestBody RoomInput input, HttpServletRequest request) {
    var user = auth.admin(request);
    String id = UUID.randomUUID().toString();
    jdbc.update(
        "INSERT INTO rooms(id,code,kind,building,capacity,campus_id,department) VALUES"
            + " (?,?,?,?,?,?,?)",
        id,
        input.code().strip(),
        input.kind(),
        input.building().strip(),
        input.capacity(),
        user.campusId(),
        user.department());
    audit.record(user, "ROOM_CREATED", id, Map.of());
    return publicView(rooms.get(id));
  }
}
