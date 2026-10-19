import type { ImportSession, Room } from "../../lib/types";
import { time } from "../../lib/format";
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
interface Props {
  sessions: ImportSession[];
  rooms: Room[];
  faculty: { id: string; name: string }[];
  editable: boolean;
  update(index: number, patch: Partial<ImportSession>): void;
  onRemove(index: number): void;
}
export function SessionReviewTable({
  sessions,
  rooms,
  faculty,
  editable,
  update,
  onRemove,
}: Props) {
  return (
    <div className="review-table-wrap">
      <table className="data-table review-table">
        <caption>Extracted sessions · {sessions.length} rows</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>From</th>
            <th>Until</th>
            <th>Room</th>
            <th>Subject / session</th>
            <th>Faculty</th>
            <th>Source</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => (
            <tr key={i}>
              <td>
                <select
                  aria-label={`Day for row ${i + 1}`}
                  disabled={!editable}
                  value={session.weekday}
                  onChange={(e) =>
                    update(i, { weekday: Number(e.target.value) })
                  }
                >
                  {days.map((day, d) => (
                    <option key={day} value={d}>
                      {day}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  aria-label={`Start for row ${i + 1}`}
                  disabled={!editable}
                  type="time"
                  value={time(session.start_time)}
                  onChange={(e) => update(i, { start_time: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`End for row ${i + 1}`}
                  disabled={!editable}
                  type="time"
                  value={time(session.end_time)}
                  onChange={(e) => update(i, { end_time: e.target.value })}
                />
              </td>
              <td>
                <select
                  aria-label={`Room for row ${i + 1}`}
                  disabled={!editable}
                  value={session.room_id || ""}
                  onChange={(e) =>
                    update(i, { room_id: e.target.value || null })
                  }
                >
                  <option value="">Unresolved</option>
                  {rooms.map((room) => (
                    <option value={room.id} key={room.id}>
                      {room.code}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  aria-label={`Subject for row ${i + 1}`}
                  disabled={!editable}
                  value={session.subject}
                  onChange={(e) => update(i, { subject: e.target.value })}
                />
              </td>
              <td>
                <select
                  multiple
                  aria-label={`Faculty for row ${i + 1}`}
                  disabled={!editable}
                  value={session.faculty_ids}
                  onChange={(e) =>
                    update(i, {
                      faculty_ids: Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    })
                  }
                >
                  {faculty.map((person) => (
                    <option value={person.id} key={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <small className="source-text">
                  {String(
                    session.source?.text ||
                      (session.source?.page
                        ? `Page ${session.source.page}`
                        : "Manual entry"),
                  )}
                </small>
              </td>
              <td>
                {editable && (
                  <button
                    className="text-link"
                    aria-label={`Remove row ${i + 1}`}
                    onClick={() => onRemove(i)}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
