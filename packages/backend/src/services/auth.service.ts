/**
 * auth.service.ts
 * Autenticação da pesquisadora: login com email/senha, cadastro e emissão de JWT.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { SessionBootstrapError } from './session.drafts';
import { RegistrationError } from './registration.error';

const JWT_EXPIRES_IN = '8h';
const BCRYPT_ROUNDS  = 10;

// Limites do cadastro. O bcrypt ignora tudo depois de 72 bytes da senha,
// então senhas maiores são recusadas em vez de truncadas sem aviso.
export const NAME_MAX_LENGTH     = 120;
export const EMAIL_MAX_LENGTH    = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES  = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResearcherPublic = {
  id:    string;
  name:  string;
  email: string;
};

export type LoginResult = {
  token:      string;
  researcher: ResearcherPublic;
};

// Payload gravado no JWT — apenas o identificador mínimo
export type JwtPayload = {
  sub: string; // researcherId
};

/**
 * Valida credenciais e retorna token JWT + dados públicos da pesquisadora.
 * Em caso de falha (email não encontrado OU senha incorreta) lança o mesmo
 * erro genérico para não revelar se o email existe.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  // E-mails são gravados em minúsculas (script de provisionamento e cadastro),
  // então "Maria@..." precisa encontrar a conta "maria@...".
  const researcher = await prisma.researcher.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  // Hash bcrypt válido de uma senha placeholder — garante que bcrypt.compare
  // seja chamado mesmo quando o email não existe (previne timing attack).
  // O hash é constante para não desperdiçar CPU a cada request malsucedido.
  const DUMMY_HASH = '$2b$10$rv3JaxvNiUGGNmbFpE3je.8Lxxing2H/Ya8FtRTgb.67pGuV21HqO';
  const hashToCompare = researcher?.passwordHash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!researcher || !valid) {
    throw new SessionBootstrapError('Credenciais inválidas.');
  }

  return {
    token: issueToken(researcher.id),
    researcher: {
      id:    researcher.id,
      name:  researcher.name,
      email: researcher.email,
      // passwordHash nunca incluído
    },
  };
}

/**
 * Normaliza e-mail para busca e gravação: sem espaços nas pontas, em minúsculas.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Emite o JWT da pesquisadora — payload só com o identificador.
 */
function issueToken(researcherId: string): string {
  const payload: JwtPayload = { sub: researcherId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Indica se o cadastro está aberto (variável REGISTRATION_OPEN=true).
 */
export function isRegistrationOpen(): boolean {
  return env.registrationOpen === true;
}

/**
 * Cria a conta da pesquisadora e já devolve o token, no mesmo formato do login.
 *
 * Erros (RegistrationError, com o status HTTP):
 *   403 — cadastro fechado
 *   400 — nome, e-mail ou senha inválidos
 *   409 — e-mail já cadastrado (inclusive dois cadastros simultâneos: o banco
 *         recusa o segundo com P2002 e a resposta é a mesma)
 *
 * A senha não sofre trim: quem cadastrou precisa entrar com exatamente o que digitou.
 */
export async function register(name: unknown, email: unknown, password: unknown): Promise<LoginResult> {
  if (!isRegistrationOpen()) {
    throw new RegistrationError(403, 'O cadastro está fechado no momento.');
  }

  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) {
    throw new RegistrationError(400, 'Informe seu nome.');
  }
  if (cleanName.length > NAME_MAX_LENGTH) {
    throw new RegistrationError(400, `O nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`);
  }

  const cleanEmail = typeof email === 'string' ? normalizeEmail(email) : '';
  if (!cleanEmail || cleanEmail.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(cleanEmail)) {
    throw new RegistrationError(400, 'Informe um e-mail válido.');
  }

  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw new RegistrationError(400, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new RegistrationError(400, `A senha é longa demais (máximo de ${PASSWORD_MAX_BYTES} caracteres).`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let researcher: ResearcherPublic;
  try {
    researcher = await prisma.researcher.create({
      data:   { name: cleanName, email: cleanEmail, passwordHash },
      select: { id: true, name: true, email: true },   // passwordHash excluído
    });
  } catch (err) {
    if (err !== null && typeof err === 'object' && (err as { code?: unknown }).code === 'P2002') {
      throw new RegistrationError(409, 'Este e-mail já tem cadastro. Tente entrar.');
    }
    throw err;
  }

  return { token: issueToken(researcher.id), researcher };
}

/**
 * Verifica um Bearer JWT e retorna o researcherId.
 * Lança SessionBootstrapError se inválido ou expirado.
 */
export function verifyToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as JwtPayload).sub !== 'string' ||
      !(payload as JwtPayload).sub
    ) {
      throw new SessionBootstrapError('Token JWT inválido ou expirado.');
    }
    return (payload as JwtPayload).sub;
  } catch (err) {
    if (err instanceof SessionBootstrapError) throw err;
    throw new SessionBootstrapError('Token JWT inválido ou expirado.');
  }
}

/**
 * Busca a pesquisadora pelo id e retorna dados públicos.
 * Lança SessionBootstrapError se não encontrada.
 */
export async function getResearcher(researcherId: string): Promise<ResearcherPublic> {
  const researcher = await prisma.researcher.findUnique({
    where: { id: researcherId },
    select: { id: true, name: true, email: true },
  });
  if (!researcher) {
    throw new SessionBootstrapError('Pesquisadora não encontrada.');
  }
  return researcher;
}
