import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Room } from "../lib/types";
import { ErrorText, Loading, Notice, PageHeading } from "../components/ui";
export function RoomRegister() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    api
      .rooms()
      .then(setRooms)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const room = await api.createRoom({
        code: String(data.get("code")),
        kind: String(data.get("kind")),
        building: String(data.get("building")),
        capacity: Number(data.get("capacity")),
      });
      setRooms((current) => [...current, room]);
      setShow(false);
      setSuccess(`Room ${room.code} added to the register.`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container page">
      <PageHeading
        title="Room register."
        text="Maintain the room identities used to match timetables and requests. Room codes keep their leading zeroes."
        action={
          <button
            className="button button-primary"
            onClick={() => setShow(!show)}
          >
            <Plus size={17} />
            Add a room
          </button>
        }
      />
      {!!error && <ErrorText error={error} />}{" "}
      {success && <Notice tone="success">{success}</Notice>}
      {show && (
        <form
          className="request-sheet stack-form inventory-form"
          onSubmit={create}
        >
          <h2>Add a classroom or lecture theatre</h2>
          <div className="form-columns">
            <label>
              Room code
              <input
                name="code"
                required
                maxLength={40}
                placeholder="e.g. 017"
              />
            </label>
            <label>
              Building
              <input name="building" required maxLength={100} />
            </label>
            <label>
              Capacity
              <input name="capacity" type="number" required min={1} />
            </label>
            <label>
              Type
              <select name="kind">
                <option value="CLASSROOM">Classroom</option>
                <option value="LT">Lecture theatre</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="text-link"
              onClick={() => setShow(false)}
            >
              Cancel
            </button>
            <button className="button button-dark" disabled={busy}>
              {busy ? "Saving…" : "Add room"}
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Building</th>
                <th>Type</th>
                <th>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>
                    <strong>{room.code}</strong>
                  </td>
                  <td>{room.building || "—"}</td>
                  <td>
                    {room.kind === "LT" ? "Lecture theatre" : "Classroom"}
                  </td>
                  <td>
                    {room.capacity === null ? "—" : `${room.capacity} seats`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
