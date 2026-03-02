-- Ensure usernames are unique
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (username);
