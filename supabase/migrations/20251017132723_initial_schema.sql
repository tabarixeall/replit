/*
  # Initial Database Schema for Call Center Application

  1. New Tables
    - `users`
      - User accounts with authentication and credit management
      - `id` (serial, primary key)
      - `username` (text, unique, not null)
      - `email` (text, unique, not null)
      - `password` (text, not null)
      - `first_name` (text)
      - `last_name` (text)
      - `role` (text, default 'user')
      - `status` (text, default 'active')
      - `credits` (integer, default 0)
      - `last_login_at` (timestamp)
      - `total_calls` (integer, default 0)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)

    - `bulk_calls`
      - Campaign management for bulk calling
      - `id` (serial, primary key)
      - `name` (text, not null)
      - `total_contacts` (integer, not null)
      - `completed_calls` (integer, default 0)
      - `failed_calls` (integer, default 0)
      - `status` (text, not null)
      - `region` (text, not null)
      - `call_from` (text, not null)
      - `user_id` (integer, not null)
      - `max_contacts` (integer, not null)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)

    - `contacts`
      - Contact information for campaigns
      - `id` (serial, primary key)
      - `name` (text)
      - `email` (text)
      - `phone` (text, not null)
      - `original_phone` (text, not null)
      - `bulk_call_id` (integer, references bulk_calls)
      - `created_at` (timestamp, default now)

    - `calls`
      - Individual call records
      - `id` (serial, primary key)
      - `call_from` (text, not null)
      - `call_to` (text, not null)
      - `region` (text, not null)
      - `status` (text, not null)
      - `duration` (text)
      - `call_id` (text)
      - `error_message` (text)
      - `timestamp` (timestamp, default now)
      - `user_id` (integer, references users)
      - `credits_cost` (integer, default 1)

    - `webhook_responses`
      - Store responses from webhook callbacks
      - `id` (serial, primary key)
      - `phone_number` (text, not null)
      - `button_pressed` (text, not null)
      - `bulk_call_id` (integer, references bulk_calls)
      - `contact_id` (integer, references contacts)
      - `contact_name` (text)
      - `contact_email` (text)
      - `campaign_name` (text)
      - `user_id` (integer, references users)
      - `timestamp` (timestamp, default now)

    - `campaign_status`
      - Track active campaign status
      - `id` (serial, primary key)
      - `active_campaign_id` (integer)
      - `active_user_id` (integer)
      - `is_xml_locked` (integer, default 0)
      - `last_updated` (timestamp, default now)

    - `xml_settings`
      - Configuration for XML call scripts
      - `id` (serial, primary key)
      - `intro_file` (text, default 'intro.wav')
      - `outro_file` (text, default 'outro.wav')
      - `connect_action` (text)
      - `input_timeout` (integer, default 50000)
      - `wait_time` (integer, default 2)
      - `updated_at` (timestamp, default now)

    - `system_logs`
      - System activity logging
      - `id` (serial, primary key)
      - `user_id` (integer, references users)
      - `action` (text, not null)
      - `details` (text)
      - `ip_address` (text)
      - `user_agent` (text)
      - `timestamp` (timestamp, default now)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated user access
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  first_name text,
  last_name text,
  role text DEFAULT 'user',
  status text DEFAULT 'active',
  credits integer DEFAULT 0,
  last_login_at timestamp,
  total_calls integer DEFAULT 0,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (current_setting('app.user_id', true))::integer)
  WITH CHECK (id = (current_setting('app.user_id', true))::integer);

-- Bulk calls table
CREATE TABLE IF NOT EXISTS bulk_calls (
  id serial PRIMARY KEY,
  name text NOT NULL,
  total_contacts integer NOT NULL,
  completed_calls integer DEFAULT 0,
  failed_calls integer DEFAULT 0,
  status text NOT NULL,
  region text NOT NULL,
  call_from text NOT NULL,
  user_id integer NOT NULL,
  max_contacts integer NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE bulk_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bulk calls"
  ON bulk_calls FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "Users can insert own bulk calls"
  ON bulk_calls FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "Users can update own bulk calls"
  ON bulk_calls FOR UPDATE
  TO authenticated
  USING (user_id = (current_setting('app.user_id', true))::integer)
  WITH CHECK (user_id = (current_setting('app.user_id', true))::integer);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id serial PRIMARY KEY,
  name text,
  email text,
  phone text NOT NULL,
  original_phone text NOT NULL,
  bulk_call_id integer,
  created_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bulk_calls
      WHERE bulk_calls.id = contacts.bulk_call_id
      AND bulk_calls.user_id = (current_setting('app.user_id', true))::integer
    )
  );

CREATE POLICY "Users can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bulk_calls
      WHERE bulk_calls.id = contacts.bulk_call_id
      AND bulk_calls.user_id = (current_setting('app.user_id', true))::integer
    )
  );

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id serial PRIMARY KEY,
  call_from text NOT NULL,
  call_to text NOT NULL,
  region text NOT NULL,
  status text NOT NULL,
  duration text,
  call_id text,
  error_message text,
  timestamp timestamp DEFAULT now() NOT NULL,
  user_id integer,
  credits_cost integer DEFAULT 1
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own calls"
  ON calls FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "Users can insert own calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('app.user_id', true))::integer);

-- Webhook responses table
CREATE TABLE IF NOT EXISTS webhook_responses (
  id serial PRIMARY KEY,
  phone_number text NOT NULL,
  button_pressed text NOT NULL,
  bulk_call_id integer,
  contact_id integer,
  contact_name text,
  contact_email text,
  campaign_name text,
  user_id integer,
  timestamp timestamp DEFAULT now() NOT NULL
);

ALTER TABLE webhook_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own webhook responses"
  ON webhook_responses FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "Users can insert webhook responses"
  ON webhook_responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('app.user_id', true))::integer);

-- Campaign status table
CREATE TABLE IF NOT EXISTS campaign_status (
  id serial PRIMARY KEY,
  active_campaign_id integer,
  active_user_id integer,
  is_xml_locked integer DEFAULT 0,
  last_updated timestamp DEFAULT now() NOT NULL
);

ALTER TABLE campaign_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read campaign status"
  ON campaign_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update campaign status"
  ON campaign_status FOR UPDATE
  TO authenticated
  USING (active_user_id = (current_setting('app.user_id', true))::integer)
  WITH CHECK (active_user_id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "Users can insert campaign status"
  ON campaign_status FOR INSERT
  TO authenticated
  WITH CHECK (active_user_id = (current_setting('app.user_id', true))::integer);

-- XML settings table
CREATE TABLE IF NOT EXISTS xml_settings (
  id serial PRIMARY KEY,
  intro_file text DEFAULT 'intro.wav',
  outro_file text DEFAULT 'outro.wav',
  connect_action text DEFAULT 'https://vi-2-xeallrender.replit.app/connect',
  input_timeout integer DEFAULT 50000,
  wait_time integer DEFAULT 2,
  updated_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE xml_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read xml settings"
  ON xml_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update xml settings"
  ON xml_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (current_setting('app.user_id', true))::integer
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (current_setting('app.user_id', true))::integer
      AND users.role = 'admin'
    )
  );

-- System logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id serial PRIMARY KEY,
  user_id integer,
  action text NOT NULL,
  details text,
  ip_address text,
  user_agent text,
  timestamp timestamp DEFAULT now() NOT NULL
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own system logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.user_id', true))::integer);

CREATE POLICY "System can insert logs"
  ON system_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);