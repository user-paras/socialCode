/*
  # Create issues table

  1. New Tables
    - `issues`
      - `id` (uuid, primary key, auto-generated)
      - `title` (text, not null)
      - `description` (text)
      - `category` (text, not null)
      - `image_url` (text, not null)
      - `latitude` (double precision, not null)
      - `longitude` (double precision, not null)
      - `status` (text, not null, default 'unresolved')
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `issues` table
    - Add policy for authenticated users to read all issues
    - Add policy for authenticated users to create issues
    - Add policy for admins to update issues
    - Add policy for users to update their own issues
*/

CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  image_url text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  status text NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all issues"
  ON issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
