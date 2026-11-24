-- Runs once, the first time the Docker database container starts.
-- Integration tests use this separate database so they never touch development data.
CREATE DATABASE silentleveling_test;
