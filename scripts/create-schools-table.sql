-- Run this in Supabase SQL Editor first, then run the import script

create table if not exists schools (
  id                  bigserial primary key,
  acara_id            integer unique not null,
  school_name         text not null,
  school_name_normalized text,
  suburb              text,
  suburb_normalized   text,
  state               text,
  postcode            text,
  sector              text,   -- Government / Catholic / Independent
  school_type         text,   -- Primary / Secondary / Combined
  year_range          text,   -- e.g. Prep-6, 7-12, Prep-12
  icsea               integer,
  icsea_percentile    integer,
  total_enrolments    integer,
  geolocation         text,
  school_url          text
);

-- Indexes for fast lookup
create index if not exists idx_schools_suburb_normalized on schools (suburb_normalized);
create index if not exists idx_schools_name_normalized  on schools (school_name_normalized);
create index if not exists idx_schools_state            on schools (state);
