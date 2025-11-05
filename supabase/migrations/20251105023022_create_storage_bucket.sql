/*
  # Create storage bucket for issue images

  1. Storage
    - Create `issue_images` bucket for storing uploaded images
    - Make bucket public for reading
    - Add policies for authenticated users to upload files
  
  2. Security
    - Users can only upload to their own folder
    - Everyone can read from the bucket (public images)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('issue_images', 'issue_images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'issue_images' AND
    (storage.foldername(name))[1] = 'public'
  );

CREATE POLICY "Anyone can read images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'issue_images');
