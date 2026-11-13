export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface Event {
  id: number;
  name: string;
  event_date: string; // YYYY-MM-DD
  location: string | null;
  bundle_price: string | number | null;
  created_at: Date;
}

export interface Photo {
  id: number;
  event_id: number;
  original_url: string;   // Private Supabase URL
  watermark_url: string;  // Public Supabase URL
  price: string | number | null;
  uploaded_at: Date;
}

export interface BibNumber {
  id: number;
  event_id: number;
  number: string;
}

export interface PhotoBib {
  photo_id: number;
  bib_number_id: number;
}

export interface Order {
  id: string; // Midtrans order_id
  buyer_email: string;
  payment_status: 'pending' | 'settlement' | 'expire' | 'deny';
  total_amount: number;
  download_token: string; // UUIDv4
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: string;
  photo_id: number | null;
}
