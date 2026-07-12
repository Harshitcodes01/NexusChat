import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development_fallback_jwt_secret_key_long_enough_to_be_secure_12345';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): { id: string } => {
  return jwt.verify(token, JWT_SECRET) as { id: string };
};
