DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can view vendor documents'
  ) THEN
    CREATE POLICY "Admins can view vendor documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload vendor documents'
  ) THEN
    CREATE POLICY "Admins can upload vendor documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update vendor documents'
  ) THEN
    CREATE POLICY "Admins can update vendor documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete vendor documents'
  ) THEN
    CREATE POLICY "Admins can delete vendor documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;