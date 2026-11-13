import type { Event, Photo, Order, Admin } from 'src/types';

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    name: 'Lari Sehat 2026',
    event_date: '2026-07-20',
    location: 'Jakarta',
    bundle_price: null,
    created_at: new Date(),
    ...overrides,
  };
}

export function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 1,
    event_id: 1,
    original_url: 'events/1/original.jpg',
    watermark_url: 'https://mock.supabase.co/public/watermark.jpg',
    price: 50000,
    uploaded_at: new Date(),
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'BIB-1712345678901-ABC123',
    buyer_email: 'buyer@test.com',
    payment_status: 'pending',
    total_amount: 50000,
    download_token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

export function makeAdmin(overrides: Partial<Admin> = {}): Admin {
  return {
    id: 1,
    username: 'admin',
    password_hash: 'mock-salt:mock-hash',
    created_at: new Date(),
    ...overrides,
  };
}
