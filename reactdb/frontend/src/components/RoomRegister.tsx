import { useEffect, useState } from 'react';
import { getOccupancyLinks, getRooms } from '../api';
import LoadingSpinner from './LoadingSpinner';
import './RoomRegister.css';

interface Room {
  id: number;
  roomNumber?: string;
  number?: string;
  roomRent: number;
}

interface Occupancy {
  roomId: number;
  tenantName: string;
  tenantPhone: string;
  rentFixed: number;
  isActive: boolean;
}

interface RoomRegisterEntry {
  id: number;
  roomNumber: string;
  roomRent: number;
  occupancy?: Occupancy;
}

export default function RoomRegister(): JSX.Element {
  const [rooms, setRooms] = useState<RoomRegisterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRoomRegister = async () => {
      try {
        setLoading(true);
        setError(null);
        const [roomData, occupancyData] = await Promise.all([
          getRooms(),
          getOccupancyLinks(),
        ]);

        if (!Array.isArray(roomData) || !Array.isArray(occupancyData)) {
          throw new Error('Room register data is unavailable.');
        }

        const entries: RoomRegisterEntry[] = (roomData as Room[])
          .map(room => {
            const occupancy = (occupancyData as Occupancy[]).find(
              item => item.isActive && Number(item.roomId) === Number(room.id),
            );

            return {
              id: room.id,
              roomNumber: String(room.roomNumber || room.number || ''),
              roomRent: Number(room.roomRent) || 0,
              occupancy,
            };
          })
          .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

        if (isMounted) {
          setRooms(entries);
        }
      } catch (fetchError) {
        console.error('Error fetching room register:', fetchError);
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load room register.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchRoomRegister();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatRent = (rent: number) =>
    `₹${rent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <section className="room-register-container" aria-labelledby="room-register-title">
      <header className="room-register-header">
        <div>
          <h1 id="room-register-title">Room Register</h1>
          <p>Current room and guest details</p>
        </div>
        <span className="room-register-count">{rooms.length} rooms</span>
      </header>

      {loading ? (
        <LoadingSpinner text="Loading room register" />
      ) : error ? (
        <div className="room-register-error" role="alert">{error}</div>
      ) : rooms.length === 0 ? (
        <p className="room-register-empty">No rooms found.</p>
      ) : (
        <div className="room-register-table-wrap">
          <table className="room-register-table">
            <thead>
              <tr>
                <th scope="col">Room No.</th>
                <th scope="col">Guest Name</th>
                <th scope="col">Rent Fixed</th>
                <th scope="col">Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.id}>
                  <td className="room-register-room-number">{room.roomNumber || '—'}</td>
                  <td>{room.occupancy?.tenantName || 'Vacant'}</td>
                  <td>{formatRent(Number(room.occupancy?.rentFixed ?? room.roomRent) || 0)}</td>
                  <td>{room.occupancy?.tenantPhone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
