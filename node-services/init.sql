CREATE DATABASE IF NOT EXISTS user_db;
CREATE DATABASE IF NOT EXISTS payment_db;

CREATE USER IF NOT EXISTS 'gym_user'@'%' IDENTIFIED BY 'local_user_only';
CREATE USER IF NOT EXISTS 'gym_payment'@'%' IDENTIFIED BY 'local_payment_only';

GRANT SELECT, INSERT, CREATE ON user_db.* TO 'gym_user'@'%';
GRANT SELECT, INSERT, CREATE ON payment_db.* TO 'gym_payment'@'%';
