import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import { getSqliteDb } from './sqliteDatabase';
import { getPool } from './database';
import { transformPhotoUrlsForResponse, transformPhotoUrlsInArray } from './photoUrlUtils';
import { isAzureConfigured, deleteAzureBlob } from './azureService';

// Room master data (Number/Rent) stays in the primary Azure SQL database even when
// tenant/occupancy records are stored locally in SQLite. Rooms are looked up on demand.
interface RoomBasicInfo {
  id: number;
  number: string;
  rent: number;
}

async function fetchRoomBasicInfo(roomIds: number[]): Promise<Map<number, RoomBasicInfo>> {
  const map = new Map<number, RoomBasicInfo>();
  const uniqueIds = Array.from(new Set(roomIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) {
    return map;
  }

  try {
    const pool = getPool();
    const request = pool.request();
    const placeholders = uniqueIds.map((id, index) => {
      const paramName = `roomId${index}`;
      request.input(paramName, sql.Int, id);
      return `@${paramName}`;
    });
    const result = await request.query(
      `SELECT Id, Number, Rent FROM RoomDetail WHERE Id IN (${placeholders.join(', ')})`
    );
    for (const row of result.recordset) {
      map.set(row.Id, { id: row.Id, number: row.Number, rent: Number(row.Rent || 0) });
    }
  } catch (error) {
    console.warn('[SQLite Tenants] Failed to look up room details from primary database:', error);
  }

  return map;
}

const tenantPhotosDir = process.env.TENANT_PHOTOS_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/tenantphotos' : path.resolve(process.cwd(), 'tenantphotos'));

const PHOTO_DB_FIELDS = [
  'PhotoUrl', 'Photo2Url', 'Photo3Url', 'Photo4Url', 'Photo5Url',
  'Photo6Url', 'Photo7Url', 'Photo8Url', 'Photo9Url', 'Photo10Url',
  'Proof1Url', 'Proof2Url', 'Proof3Url', 'Proof4Url', 'Proof5Url',
  'Proof6Url', 'Proof7Url', 'Proof8Url', 'Proof9Url', 'Proof10Url'
];

const mapTenantRow = (row: any) => ({
  id: row.Id,
  name: (row.Name || '').trim(),
  phone: (row.Phone || '').trim(),
  address: (row.Address || '').trim(),
  city: (row.City || '').trim(),
  photoUrl: row.PhotoUrl, photo2Url: row.Photo2Url, photo3Url: row.Photo3Url, photo4Url: row.Photo4Url, photo5Url: row.Photo5Url,
  photo6Url: row.Photo6Url, photo7Url: row.Photo7Url, photo8Url: row.Photo8Url, photo9Url: row.Photo9Url, photo10Url: row.Photo10Url,
  proof1Url: row.Proof1Url, proof2Url: row.Proof2Url, proof3Url: row.Proof3Url, proof4Url: row.Proof4Url, proof5Url: row.Proof5Url,
  proof6Url: row.Proof6Url, proof7Url: row.Proof7Url, proof8Url: row.Proof8Url, proof9Url: row.Proof9Url, proof10Url: row.Proof10Url,
});

function errorResponse(res: Response, status: number, error: string, err: unknown) {
  const details = err instanceof Error ? err.message : String(err);
  res.status(status).json({ error, details });
}

// GET /api/tenants/with-occupancy
export async function getAllTenantsWithOccupancy(req: Request, res: Response) {
  try {
    const db = getSqliteDb();
    const tenants = db.prepare('SELECT * FROM Tenant ORDER BY Name ASC').all() as any[];
    const activeOccupancies = db.prepare(`
      SELECT * FROM Occupancy
      WHERE CheckOutDate IS NULL OR TRIM(CheckOutDate) = '' OR date(CheckOutDate) >= date('now')
    `).all() as any[];

    const occupancyByTenant = new Map<number, any>();
    for (const occ of activeOccupancies) {
      if (!occupancyByTenant.has(occ.TenantId)) {
        occupancyByTenant.set(occ.TenantId, occ);
      }
    }

    const roomInfoMap = await fetchRoomBasicInfo(activeOccupancies.map((o) => o.RoomId));

    const records = tenants.map((row) => {
      const occ = occupancyByTenant.get(row.Id);
      const room = occ ? roomInfoMap.get(occ.RoomId) : undefined;
      return {
        ...mapTenantRow(row),
        occupancyId: occ ? occ.Id : null,
        roomId: occ ? occ.RoomId : null,
        roomNumber: room ? room.number : null,
        checkInDate: occ ? occ.CheckInDate : null,
        checkOutDate: occ ? occ.CheckOutDate : null,
        rentFixed: occ ? Number(occ.RentFixed ?? room?.rent ?? 0) : 0,
        depositReceived: occ ? Number(occ.DepositReceived ?? 0) : 0,
        isCurrentlyOccupied: occ ? 1 : 0,
        // Rent-collection payment tracking is not yet mirrored to local SQLite storage.
        currentPendingPayment: 0,
        currentRentReceived: 0,
        lastPaymentDate: null,
      };
    });

    res.json(transformPhotoUrlsInArray(records));
  } catch (error) {
    console.error('[SQLite] Get tenants error:', error);
    errorResponse(res, 500, 'Failed to retrieve tenants', error);
  }
}

// GET /api/tenants/:id
export async function getTenantById(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.id, 10);
    if (Number.isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const db = getSqliteDb();
    const row = db.prepare('SELECT * FROM Tenant WHERE Id = ?').get(tenantId) as any;
    if (!row) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const occ = db.prepare(`
      SELECT * FROM Occupancy WHERE TenantId = ? AND CheckOutDate IS NULL
      ORDER BY Id DESC LIMIT 1
    `).get(tenantId) as any;

    const roomInfoMap = occ ? await fetchRoomBasicInfo([occ.RoomId]) : new Map<number, RoomBasicInfo>();
    const room = occ ? roomInfoMap.get(occ.RoomId) : undefined;

    const tenant = {
      ...mapTenantRow(row),
      occupancyId: occ ? occ.Id : null,
      roomId: occ ? occ.RoomId : null,
      roomNumber: room ? room.number : null,
      CheckInDate: occ ? occ.CheckInDate : null,
      CheckOutDate: occ ? occ.CheckOutDate : null,
      rentFixed: occ ? Number(occ.RentFixed ?? room?.rent ?? 0) : 0,
      depositReceived: occ ? Number(occ.DepositReceived ?? 0) : 0,
    };

    res.json(transformPhotoUrlsForResponse(tenant));
  } catch (error) {
    console.error('[SQLite] Get tenant error:', error);
    errorResponse(res, 500, 'Failed to retrieve tenant', error);
  }
}

// GET /api/tenants/:id/occupancy-history
export async function getTenantOccupancyHistory(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.id, 10);
    if (Number.isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const db = getSqliteDb();
    const rows = db.prepare(`
      SELECT * FROM Occupancy WHERE TenantId = ? ORDER BY CheckInDate DESC, Id DESC
    `).all(tenantId) as any[];

    const roomInfoMap = await fetchRoomBasicInfo(rows.map((r) => r.RoomId));

    res.json(rows.map((r) => ({
      occupancyId: r.Id,
      roomId: r.RoomId,
      roomNumber: roomInfoMap.get(r.RoomId)?.number ?? null,
      checkInDate: r.CheckInDate,
      checkOutDate: r.CheckOutDate,
      updatedDate: r.UpdatedDate,
      rentFixed: r.RentFixed,
      depositReceived: r.DepositReceived,
      depositRefunded: r.DepositRefunded,
      charges: r.Charges,
    })));
  } catch (error) {
    console.error('[SQLite] Get tenant occupancy history error:', error);
    errorResponse(res, 500, 'Failed to retrieve tenant occupancy history', error);
  }
}

// GET /api/tenants/check-phone/:phone
export async function checkPhoneNumber(req: Request, res: Response) {
  try {
    const { phone } = req.params;
    const excludeTenantId = req.query.excludeId ? parseInt(req.query.excludeId as string, 10) : null;

    const db = getSqliteDb();
    const row = excludeTenantId
      ? db.prepare('SELECT Id, Name FROM Tenant WHERE TRIM(Phone) = TRIM(?) AND Id != ?').get(phone, excludeTenantId) as any
      : db.prepare('SELECT Id, Name FROM Tenant WHERE TRIM(Phone) = TRIM(?)').get(phone) as any;

    const exists = !!row;
    const tenantName = exists ? (String(row.Name || '').trim() || 'Unnamed Tenant') : null;

    res.json({ exists, phone: phone.trim(), tenantName });
  } catch (error) {
    console.error('[SQLite] Check phone error:', error);
    errorResponse(res, 500, 'Failed to check phone number', error);
  }
}

// POST /api/tenants
export async function createTenant(req: Request, res: Response) {
  try {
    const {
      name, phone, address, city, roomId, checkInDate, checkOutDate,
      roomRent, depositReceived,
      photoUrl, photo2Url, photo3Url, photo4Url, photo5Url, photo6Url, photo7Url, photo8Url, photo9Url, photo10Url,
      proof1Url, proof2Url, proof3Url, proof4Url, proof5Url, proof6Url, proof7Url, proof8Url, proof9Url, proof10Url
    } = req.body;

    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const phoneDigits = String(phone).replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        error: 'Invalid phone format',
        details: `Phone number must be exactly 10 digits (received ${phoneDigits.length} digits)`
      });
    }

    const creatingOccupancy = roomId && checkInDate;
    if (roomId && checkInDate && !checkOutDate) {
      return res.status(400).json({ error: 'Both check-in date and check-out date are required to create an occupancy' });
    }

    if (checkOutDate && typeof checkOutDate !== 'string') {
      return res.status(400).json({ error: 'Invalid checkOutDate format' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (checkOutDate && !dateRegex.test(checkOutDate)) {
      return res.status(400).json({ error: 'Invalid checkOutDate format', details: 'Date must be in YYYY-MM-DD format' });
    }

    if (checkInDate && checkOutDate && new Date(checkOutDate) <= new Date(checkInDate)) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const parsedRoomRent = roomRent !== undefined && roomRent !== null && roomRent !== ''
      ? Number(roomRent) : null;
    if (parsedRoomRent !== null && (!Number.isFinite(parsedRoomRent) || parsedRoomRent < 0)) {
      return res.status(400).json({ error: 'Room rent must be a valid non-negative number' });
    }

    const parsedDepositReceived = depositReceived !== undefined && depositReceived !== null && depositReceived !== ''
      ? Number(depositReceived) : null;
    if (parsedDepositReceived !== null && (!Number.isFinite(parsedDepositReceived) || parsedDepositReceived < 0)) {
      return res.status(400).json({ error: 'Advance amount must be a valid non-negative number' });
    }

    const db = getSqliteDb();

    const phoneExists = db.prepare('SELECT COUNT(*) as count FROM Tenant WHERE TRIM(Phone) = TRIM(?)').get(phone) as any;
    if (phoneExists.count > 0) {
      return res.status(400).json({
        error: 'Phone number already exists',
        details: `A tenant with phone number ${String(phone).trim()} already exists in the database.`
      });
    }

    if (creatingOccupancy) {
      const roomMap = await fetchRoomBasicInfo([Number(roomId)]);
      if (!roomMap.has(Number(roomId))) {
        return res.status(400).json({ error: 'Invalid room ID', details: `Room with ID ${roomId} does not exist` });
      }
    }

    const insertTenant = db.prepare(`
      INSERT INTO Tenant (Name, Phone, Address, City, PhotoUrl, Photo2Url, Photo3Url, Photo4Url, Photo5Url, Photo6Url, Photo7Url, Photo8Url, Photo9Url, Photo10Url, Proof1Url, Proof2Url, Proof3Url, Proof4Url, Proof5Url, Proof6Url, Proof7Url, Proof8Url, Proof9Url, Proof10Url)
      VALUES (@name, @phone, @address, @city, @photoUrl, @photo2Url, @photo3Url, @photo4Url, @photo5Url, @photo6Url, @photo7Url, @photo8Url, @photo9Url, @photo10Url, @proof1Url, @proof2Url, @proof3Url, @proof4Url, @proof5Url, @proof6Url, @proof7Url, @proof8Url, @proof9Url, @proof10Url)
    `);
    const insertInfo = insertTenant.run({
      name, phone, address, city,
      photoUrl: photoUrl || null, photo2Url: photo2Url || null, photo3Url: photo3Url || null, photo4Url: photo4Url || null, photo5Url: photo5Url || null,
      photo6Url: photo6Url || null, photo7Url: photo7Url || null, photo8Url: photo8Url || null, photo9Url: photo9Url || null, photo10Url: photo10Url || null,
      proof1Url: proof1Url || null, proof2Url: proof2Url || null, proof3Url: proof3Url || null, proof4Url: proof4Url || null, proof5Url: proof5Url || null,
      proof6Url: proof6Url || null, proof7Url: proof7Url || null, proof8Url: proof8Url || null, proof9Url: proof9Url || null, proof10Url: proof10Url || null,
    });

    const tenantId = Number(insertInfo.lastInsertRowid);
    let occupancyId: number | null = null;

    if (creatingOccupancy) {
      try {
        const roomMap = await fetchRoomBasicInfo([Number(roomId)]);
        const room = roomMap.get(Number(roomId));
        const effectiveRoomRent = parsedRoomRent !== null ? parsedRoomRent : (room?.rent ?? 0);
        const effectiveDepositReceived = parsedDepositReceived !== null ? parsedDepositReceived : 0;

        const insertOccupancy = db.prepare(`
          INSERT INTO Occupancy (TenantId, RoomId, CheckInDate, CheckOutDate, CreatedDate, UpdatedDate, RentFixed, DepositReceived)
          VALUES (@tenantId, @roomId, @checkInDate, @checkOutDate, datetime('now'), datetime('now'), @rentFixed, @depositReceived)
        `);
        const occInfo = insertOccupancy.run({
          tenantId, roomId: Number(roomId), checkInDate, checkOutDate: checkOutDate || null,
          rentFixed: effectiveRoomRent, depositReceived: effectiveDepositReceived,
        });
        occupancyId = Number(occInfo.lastInsertRowid);
        console.log(`[SQLite Tenant Creation] Created occupancy ${occupancyId} for tenant ${tenantId} in room ${roomId}`);
      } catch (occupancyError) {
        console.error('[SQLite] Error creating occupancy:', occupancyError);
        return res.status(500).json({
          error: 'Failed to create occupancy',
          details: occupancyError instanceof Error ? occupancyError.message : String(occupancyError),
          tenantId,
          message: 'Tenant was created but occupancy creation failed'
        });
      }
    }

    res.status(201).json({
      id: tenantId,
      occupancyId,
      message: creatingOccupancy ? 'Tenant and occupancy created successfully' : 'Tenant created successfully'
    });
  } catch (error) {
    console.error('[SQLite] Create tenant error:', error);
    errorResponse(res, 500, 'Failed to create tenant', error);
  }
}

// PUT /api/tenants/:id
export async function updateTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const {
      roomIds, checkInDate, checkOutDate,
      name, phone, address, city,
      roomRent, depositReceived,
      photoUrl, photo2Url, photo3Url, photo4Url, photo5Url, photo6Url, photo7Url, photo8Url, photo9Url, photo10Url,
      proof1Url, proof2Url, proof3Url, proof4Url, proof5Url, proof6Url, proof7Url, proof8Url, proof9Url, proof10Url
    } = req.body;

    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const phoneDigits = String(phone).replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        error: 'Invalid phone format',
        details: `Phone number must be exactly 10 digits (received ${phoneDigits.length} digits)`
      });
    }

    const db = getSqliteDb();

    const phoneExists = db.prepare('SELECT COUNT(*) as count FROM Tenant WHERE TRIM(Phone) = TRIM(?) AND Id != ?').get(phone, tenantId) as any;
    if (phoneExists.count > 0) {
      return res.status(400).json({
        error: 'Phone number already exists',
        details: `Phone number ${String(phone).trim()} is already used by another tenant.`
      });
    }

    const requestedRoomIds: number[] = Array.isArray(roomIds)
      ? Array.from(new Set(roomIds.map((value: any) => parseInt(value, 10)).filter((value: number) => Number.isInteger(value) && value > 0)))
      : [];

    const parsedRoomRentOverride = roomRent !== undefined && roomRent !== null && roomRent !== ''
      ? Number(roomRent) : null;
    if (parsedRoomRentOverride !== null && (!Number.isFinite(parsedRoomRentOverride) || parsedRoomRentOverride < 0)) {
      return res.status(400).json({ error: 'Room rent must be a valid non-negative number' });
    }

    const parsedDepositOverride = depositReceived !== undefined && depositReceived !== null && depositReceived !== ''
      ? Number(depositReceived) : null;
    if (parsedDepositOverride !== null && (!Number.isFinite(parsedDepositOverride) || parsedDepositOverride < 0)) {
      return res.status(400).json({ error: 'Advance amount must be a valid non-negative number' });
    }

    if (requestedRoomIds.length > 0) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!checkInDate || typeof checkInDate !== 'string' || !dateRegex.test(checkInDate)) {
        return res.status(400).json({ error: 'checkInDate is required when assigning roomIds' });
      }
      if (!checkOutDate || typeof checkOutDate !== 'string' || !dateRegex.test(checkOutDate)) {
        return res.status(400).json({ error: 'checkOutDate is required when assigning roomIds' });
      }
      if (new Date(checkInDate) > new Date()) {
        return res.status(400).json({ error: 'Check-in date cannot be in the future' });
      }
      if (new Date(checkOutDate) <= new Date(checkInDate)) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
      }

      const roomMap = await fetchRoomBasicInfo(requestedRoomIds);
      const unknownRoomIds = requestedRoomIds.filter((id) => !roomMap.has(id));
      if (unknownRoomIds.length > 0) {
        return res.status(400).json({
          error: 'Some selected rooms do not exist',
          details: `Invalid room IDs: ${unknownRoomIds.join(', ')}`
        });
      }

      const occupiedRoomNumbers: string[] = [];
      for (const roomId of requestedRoomIds) {
        const occupiedByOther = db.prepare(`
          SELECT 1 FROM Occupancy
          WHERE RoomId = ? AND TenantId != ?
            AND (CheckOutDate IS NULL OR date(CheckOutDate) > date('now'))
          LIMIT 1
        `).get(roomId, tenantId);
        if (occupiedByOther) {
          occupiedRoomNumbers.push(roomMap.get(roomId)?.number ?? String(roomId));
        }
      }
      if (occupiedRoomNumbers.length > 0) {
        return res.status(400).json({
          error: 'Some selected rooms are currently occupied by another tenant',
          details: `Occupied room(s): ${occupiedRoomNumbers.join(', ')}`
        });
      }
    }

    const existingTenant = db.prepare('SELECT * FROM Tenant WHERE Id = ?').get(tenantId) as any;
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const trimmedExistingUrls: any = {};
    for (const field of PHOTO_DB_FIELDS) {
      trimmedExistingUrls[field] = existingTenant[field] ? String(existingTenant[field]).trim() : null;
    }

    const newUrls: Record<string, any> = {
      photoUrl, photo2Url, photo3Url, photo4Url, photo5Url, photo6Url, photo7Url, photo8Url, photo9Url, photo10Url,
      proof1Url, proof2Url, proof3Url, proof4Url, proof5Url, proof6Url, proof7Url, proof8Url, proof9Url, proof10Url
    };
    const dbToNewField: Record<string, string> = {
      PhotoUrl: 'photoUrl', Photo2Url: 'photo2Url', Photo3Url: 'photo3Url', Photo4Url: 'photo4Url', Photo5Url: 'photo5Url',
      Photo6Url: 'photo6Url', Photo7Url: 'photo7Url', Photo8Url: 'photo8Url', Photo9Url: 'photo9Url', Photo10Url: 'photo10Url',
      Proof1Url: 'proof1Url', Proof2Url: 'proof2Url', Proof3Url: 'proof3Url', Proof4Url: 'proof4Url', Proof5Url: 'proof5Url',
      Proof6Url: 'proof6Url', Proof7Url: 'proof7Url', Proof8Url: 'proof8Url', Proof9Url: 'proof9Url', Proof10Url: 'proof10Url',
    };

    const azureConfigured = isAzureConfigured();

    for (const dbField of PHOTO_DB_FIELDS) {
      const oldBlobName = trimmedExistingUrls[dbField];
      const newBlobName = newUrls[dbToNewField[dbField]];
      const oldFilename = oldBlobName ? oldBlobName.split('/').pop() : null;
      const newFilename = newBlobName ? newBlobName.split('/').pop() : null;

      if (oldFilename && oldFilename !== newFilename) {
        if (azureConfigured) {
          try {
            await deleteAzureBlob(oldBlobName);
          } catch (deleteError) {
            console.error(`[SQLite Tenant Update] Failed to delete from Azure: ${oldBlobName}`, deleteError);
          }
        } else {
          try {
            const filePath = path.join(tenantPhotosDir, oldFilename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (deleteError) {
            console.error(`[SQLite Tenant Update] Failed to delete disk file: ${oldBlobName}`, deleteError);
          }
        }
      }
    }

    const updateTenantStmt = db.prepare(`
      UPDATE Tenant
      SET Name = @name, Phone = @phone, Address = @address, City = @city,
          PhotoUrl = @photoUrl, Photo2Url = @photo2Url, Photo3Url = @photo3Url, Photo4Url = @photo4Url, Photo5Url = @photo5Url,
          Photo6Url = @photo6Url, Photo7Url = @photo7Url, Photo8Url = @photo8Url, Photo9Url = @photo9Url, Photo10Url = @photo10Url,
          Proof1Url = @proof1Url, Proof2Url = @proof2Url, Proof3Url = @proof3Url, Proof4Url = @proof4Url, Proof5Url = @proof5Url,
          Proof6Url = @proof6Url, Proof7Url = @proof7Url, Proof8Url = @proof8Url, Proof9Url = @proof9Url, Proof10Url = @proof10Url
      WHERE Id = @id
    `);
    const updateInfo = updateTenantStmt.run({
      id: tenantId, name, phone, address, city,
      photoUrl: photoUrl || null, photo2Url: photo2Url || null, photo3Url: photo3Url || null, photo4Url: photo4Url || null, photo5Url: photo5Url || null,
      photo6Url: photo6Url || null, photo7Url: photo7Url || null, photo8Url: photo8Url || null, photo9Url: photo9Url || null, photo10Url: photo10Url || null,
      proof1Url: proof1Url || null, proof2Url: proof2Url || null, proof3Url: proof3Url || null, proof4Url: proof4Url || null, proof5Url: proof5Url || null,
      proof6Url: proof6Url || null, proof7Url: proof7Url || null, proof8Url: proof8Url || null, proof9Url: proof9Url || null, proof10Url: proof10Url || null,
    });

    if (updateInfo.changes === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (parsedRoomRentOverride !== null || parsedDepositOverride !== null) {
      const activeOccupancies = db.prepare(`
        SELECT * FROM Occupancy WHERE TenantId = ? AND (CheckOutDate IS NULL OR date(CheckOutDate) > date('now'))
      `).all(tenantId) as any[];

      const updateOccupancyRentStmt = db.prepare(`
        UPDATE Occupancy SET RentFixed = @rentFixed, DepositReceived = @depositReceived, UpdatedDate = datetime('now') WHERE Id = @id
      `);

      for (const occ of activeOccupancies) {
        const nextRent = parsedRoomRentOverride !== null ? parsedRoomRentOverride : Number(occ.RentFixed || 0);
        const nextDeposit = parsedDepositOverride !== null ? parsedDepositOverride : Number(occ.DepositReceived || 0);
        updateOccupancyRentStmt.run({ id: occ.Id, rentFixed: nextRent, depositReceived: nextDeposit });
      }
    }

    let createdOccupancies = 0;

    if (checkOutDate && typeof checkOutDate === 'string') {
      db.prepare(`
        UPDATE Occupancy SET CheckOutDate = @checkOutDate, UpdatedDate = datetime('now')
        WHERE TenantId = @tenantId AND (CheckOutDate IS NULL OR date(CheckOutDate) > date('now'))
      `).run({ tenantId, checkOutDate });
    }

    if (requestedRoomIds.length > 0) {
      const roomMap = await fetchRoomBasicInfo(requestedRoomIds);
      const insertOccupancyStmt = db.prepare(`
        INSERT INTO Occupancy (TenantId, RoomId, CheckInDate, CheckOutDate, CreatedDate, UpdatedDate, RentFixed, DepositReceived)
        VALUES (@tenantId, @roomId, @checkInDate, @checkOutDate, datetime('now'), datetime('now'), @rentFixed, @depositReceived)
      `);

      for (const roomId of requestedRoomIds) {
        const alreadyAssigned = db.prepare(`
          SELECT 1 FROM Occupancy WHERE RoomId = ? AND TenantId = ?
            AND (CheckOutDate IS NULL OR date(CheckOutDate) > date('now'))
          LIMIT 1
        `).get(roomId, tenantId);
        if (alreadyAssigned) {
          continue;
        }

        const room = roomMap.get(roomId);
        const effectiveRoomRent = parsedRoomRentOverride !== null ? parsedRoomRentOverride : (room?.rent ?? 0);
        const effectiveDepositReceived = parsedDepositOverride !== null ? parsedDepositOverride : 0;

        insertOccupancyStmt.run({
          tenantId, roomId, checkInDate, checkOutDate: checkOutDate || null,
          rentFixed: effectiveRoomRent, depositReceived: effectiveDepositReceived,
        });
        createdOccupancies += 1;
      }
    }

    res.json({ message: 'Tenant updated successfully', deletedFiles: true, createdOccupancies });
  } catch (error) {
    console.error('[SQLite] Update tenant error:', error);
    errorResponse(res, 500, 'Failed to update tenant', error);
  }
}

// DELETE /api/tenants/:id
export async function deleteTenant(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const db = getSqliteDb();

    const activeOccupancy = db.prepare('SELECT COUNT(*) as count FROM Occupancy WHERE TenantId = ? AND CheckOutDate IS NULL').get(tenantId) as any;
    if (activeOccupancy.count > 0) {
      return res.status(400).json({ error: 'Cannot delete tenant with active occupancy. Check out the tenant first.' });
    }

    const tenant = db.prepare('SELECT * FROM Tenant WHERE Id = ?').get(tenantId) as any;
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const filesToDelete = PHOTO_DB_FIELDS.map((field) => tenant[field]).filter(Boolean);
    for (const fileUrl of filesToDelete) {
      try {
        const fileName = String(fileUrl).split('/').pop();
        if (fileName) {
          const filePath = path.join(tenantPhotosDir, fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (fileErr) {
        console.warn('[SQLite Tenant Delete] Warning: Could not delete file:', fileUrl, fileErr);
      }
    }

    const deleteInfo = db.prepare('DELETE FROM Tenant WHERE Id = ?').run(tenantId);
    if (deleteInfo.changes === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('[SQLite] Delete tenant error:', error);
    errorResponse(res, 500, 'Failed to delete tenant', error);
  }
}

// GET /api/tenants/search
export async function searchTenants(req: Request, res: Response) {
  try {
    const { field, query } = req.query;
    if (!field || !query) {
      return res.status(400).json({ error: 'Missing field or query parameter' });
    }

    const columnByField: Record<string, string> = { name: 'Name', phone: 'Phone', city: 'City', address: 'Address' };
    const column = columnByField[field as string];
    if (!column) {
      return res.status(400).json({ error: 'Invalid search field' });
    }

    const db = getSqliteDb();
    const searchQuery = `%${query}%`;
    const tenants = db.prepare(`SELECT * FROM Tenant WHERE TRIM(${column}) LIKE ?`).all(searchQuery) as any[];

    const activeOccupancies = db.prepare(`
      SELECT * FROM Occupancy WHERE CheckOutDate IS NULL
    `).all() as any[];
    const occupancyByTenant = new Map<number, any>();
    for (const occ of activeOccupancies) {
      occupancyByTenant.set(occ.TenantId, occ);
    }
    const roomInfoMap = await fetchRoomBasicInfo(activeOccupancies.map((o) => o.RoomId));

    const records = tenants.map((row) => {
      const occ = occupancyByTenant.get(row.Id);
      const room = occ ? roomInfoMap.get(occ.RoomId) : undefined;
      return {
        ...mapTenantRow(row),
        occupancyId: occ ? occ.Id : null,
        roomNumber: room ? room.number : null,
        CheckInDate: occ ? occ.CheckInDate : null,
        CheckOutDate: occ ? occ.CheckOutDate : null,
        RentFixed: occ ? occ.RentFixed : null,
        isCurrentlyOccupied: occ ? 1 : 0,
      };
    });

    res.json(transformPhotoUrlsInArray(records));
  } catch (error) {
    console.error('[SQLite] Search tenants error:', error);
    errorResponse(res, 500, 'Failed to search tenants', error);
  }
}
