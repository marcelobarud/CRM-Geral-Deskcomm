-- 0267: preserva validação de e-mail/E.164 com padrões sem escape ambíguo.
alter table public.contacts drop constraint if exists contacts_email_format;
alter table public.contacts add constraint contacts_email_format check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$');
alter table public.contacts drop constraint if exists contacts_phone_e164_format;
alter table public.contacts add constraint contacts_phone_e164_format check (phone_number is null or phone_number ~ '^[+][0-9]{8,15}$');
