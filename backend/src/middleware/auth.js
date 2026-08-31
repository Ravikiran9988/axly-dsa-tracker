const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const authUserRepository = require('../db/authUserRepository');
const { getDatabaseDriver } = require('../db/repository');
const PostgresRepository = require('../db/postgresRepository');
const SqliteRepository = require('../db/sqliteRepository');
const { AppError } = require('./errorHandler');

const getSqliteRepository = () => new SqliteRepository();

const SUPABASE_URL = process.env.SUPABASE_URL;
