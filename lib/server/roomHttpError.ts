import { NextResponse } from 'next/server';
import { RoomServiceError } from './roomErrors';
import { RoomStorageError } from './roomStore';
import { InvalidRoomDataError } from './roomSchema';

export function roomHttpError(error: unknown) {
  if (error instanceof RoomServiceError || error instanceof RoomStorageError) {
    return NextResponse.json({ error: error.message, retryable: error.retryable }, {
      status: error.status, headers: { 'Cache-Control': 'no-store', ...(error.status === 429 ? { 'Retry-After': '60' } : {}) },
    });
  }
  return NextResponse.json({
    error: error instanceof InvalidRoomDataError ? error.message : 'เกิดข้อผิดพลาด กรุณาลองคำขอเดิมอีกครั้ง',
    retryable: !(error instanceof InvalidRoomDataError),
  }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}
