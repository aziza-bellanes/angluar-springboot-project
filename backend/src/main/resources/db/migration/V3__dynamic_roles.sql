-- Preserve existing role IDs and user assignments while separating labels from permissions.
ALTER TABLE roles
    ADD COLUMN profile VARCHAR(32) NULL,
    ADD COLUMN system_key VARCHAR(32) NULL,
    ADD CONSTRAINT uk_roles_system_key UNIQUE (system_key);

UPDATE roles SET profile = libelle, system_key = libelle;

ALTER TABLE roles MODIFY COLUMN profile VARCHAR(32) NOT NULL;
