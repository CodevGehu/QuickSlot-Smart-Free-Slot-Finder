package in.quickslot.inventory;

public record Room(
    String id,
    String code,
    String kind,
    String building,
    int capacity,
    String campusId,
    String department,
    boolean active) {}
