import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Status } from "../../components/ui";
import type { Availability } from "../../lib/types";

interface RoomDirectoryProps {
  rooms: Availability["rooms"];
  date: string;
  start: string;
  end: string;
}

export function RoomDirectory({ rooms, date, start, end }: RoomDirectoryProps) {
  return (
    <div className="room-card-grid">
      {rooms.map((room) => (
        <Link
          className="room-row room-card"
          key={room.id}
          to={`/rooms/${room.id}?date=${date}&start_time=${start}&end_time=${end}`}
        >
          <div className="room-card-heading">
            <div>
              <span className="room-kind">
                {room.kind === "LT" ? "Lecture theatre" : "Classroom"}
              </span>
              <h3 className="room-number">
                {room.code} <span>({room.kind === "LT" ? "LT" : "CR"})</span>
              </h3>
            </div>
            <Status value={room.state} />
          </div>
          <dl className="room-details">
            <div>
              <dt>Building</dt>
              <dd>{room.building || "—"}</dd>
            </div>
            <div>
              <dt>Capacity</dt>
              <dd>{room.capacity === null ? "—" : `${room.capacity} seats`}</dd>
            </div>
          </dl>
          <p className="room-reason">{room.reason}</p>
          <div className="room-card-footer">
            <span>View schedule</span>
            <ArrowUpRight size={16} />
          </div>
        </Link>
      ))}
    </div>
  );
}
