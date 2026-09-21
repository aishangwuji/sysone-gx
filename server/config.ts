import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
  jwtSecret: process.env.JWT_SECRET || 'sysone_gx_jwt_secret_dev_2026_super_secure',
  jwtExpiresIn: '7d',
  sessionSalt: process.env.SESSION_SALT || 'sysone_gx_salt_2026',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sysone_admin:SysOne_Gx_2026_Secure!@127.0.0.1:5432/sysone_gx',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
