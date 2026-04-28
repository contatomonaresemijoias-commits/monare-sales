-- Rotate the previously-leaked password to a random value.
-- The user must reset their password via the standard auth flow.
UPDATE auth.users
SET encrypted_password = crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf'))
WHERE email = 'coelho@monare.com';