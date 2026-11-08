/**
 * auth.service.test.ts
 * Testes unitários de auth.service.ts com Prisma e bcrypt mockados.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    researcher: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../src/config/env', () => ({
  env: { jwtSecret: 'test-secret-32-chars-long-enough!', registrationOpen: true },
}));

import {
  login, verifyToken, getResearcher, register, isRegistrationOpen, normalizeEmail,
} from '../../src/services/auth.service';
import { SessionBootstrapError } from '../../src/services/session.drafts';
import { RegistrationError } from '../../src/services/registration.error';
import { prisma } from '../../src/config/prisma';
import { env } from '../../src/config/env';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const HASH = bcrypt.hashSync('senha123', 10);

const mockResearcher = {
  id:           'res-001',
  name:         'Luiza Caldas',
  email:        'luiza@unb.br',
  passwordHash: HASH,
};

beforeEach(() => {
  vi.resetAllMocks();
  (env as { registrationOpen: boolean }).registrationOpen = true;
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('login — sucesso', () => {
  it('retorna token e dados públicos sem passwordHash', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(mockResearcher as never);
    const result = await login('luiza@unb.br', 'senha123');

    expect(result.token).toBeTruthy();
    expect(result.researcher.id).toBe('res-001');
    expect(result.researcher.name).toBe('Luiza Caldas');
    expect(result.researcher.email).toBe('luiza@unb.br');
    expect((result.researcher as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('JWT contém somente sub (researcherId)', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(mockResearcher as never);
    const { token } = await login('luiza@unb.br', 'senha123');
    const payload = jwt.decode(token) as Record<string, unknown>;

    expect(payload.sub).toBe('res-001');
    expect(payload.email).toBeUndefined();
    expect(payload.name).toBeUndefined();
    expect(payload.passwordHash).toBeUndefined();
  });
});

describe('login — falha', () => {
  it('senha incorreta → 401 sem revelar se email existe', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(mockResearcher as never);
    await expect(login('luiza@unb.br', 'errada')).rejects.toThrow(SessionBootstrapError);
    await expect(login('luiza@unb.br', 'errada')).rejects.toThrow(/Credenciais inválidas/);
  });

  it('email não encontrado → mesmo erro genérico (não revela ausência)', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(null as never);
    await expect(login('naoexiste@unb.br', 'qualquer')).rejects.toThrow(SessionBootstrapError);
    await expect(login('naoexiste@unb.br', 'qualquer')).rejects.toThrow(/Credenciais inválidas/);
  });

  it('erro de email não encontrado é indistinguível do erro de senha incorreta', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(null as never);
    let errNotFound: Error | null = null;
    try { await login('x@x.com', 'y'); } catch (e) { errNotFound = e as Error; }

    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(mockResearcher as never);
    let errWrongPwd: Error | null = null;
    try { await login('luiza@unb.br', 'errada'); } catch (e) { errWrongPwd = e as Error; }

    expect(errNotFound?.message).toBe(errWrongPwd?.message);
  });
});

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------

describe('login — timing attack safe', () => {
  it('email inexistente ainda chama bcrypt.compare com hash bcrypt válido (2b$10$)', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(null as never);
    const spy = vi.spyOn(bcrypt, 'compare');
    try { await login('naoexiste@unb.br', 'qualquer'); } catch { /* esperado */ }

    expect(spy).toHaveBeenCalledTimes(1);
    const hashUsado = spy.mock.calls[0][1] as string;
    // O hash deve ser um hash bcrypt real, não um placeholder inválido
    expect(hashUsado).toMatch(/^\$2[ab]\$\d+\$/);
  });
});

describe('verifyToken', () => {
  it('token válido retorna researcherId', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(mockResearcher as never);
    const { token } = await login('luiza@unb.br', 'senha123');
    const id = verifyToken(token);
    expect(id).toBe('res-001');
  });

  it('token adulterado → lança SessionBootstrapError', () => {
    expect(() => verifyToken('nao.e.um.jwt')).toThrow(SessionBootstrapError);
    expect(() => verifyToken('nao.e.um.jwt')).toThrow(/inválido/);
  });

  it('token de secret diferente → lança SessionBootstrapError', () => {
    const alien = jwt.sign({ sub: 'res-001' }, 'outro-secret');
    expect(() => verifyToken(alien)).toThrow(SessionBootstrapError);
  });

  it('JWT sem campo sub → lança SessionBootstrapError', () => {
    const noSub = jwt.sign({ role: 'researcher' }, 'test-secret-32-chars-long-enough!');
    expect(() => verifyToken(noSub)).toThrow(SessionBootstrapError);
    expect(() => verifyToken(noSub)).toThrow(/inválido/);
  });

  it('JWT com sub não-string (número) → lança SessionBootstrapError', () => {
    const numSub = jwt.sign({ sub: 12345 }, 'test-secret-32-chars-long-enough!');
    expect(() => verifyToken(numSub)).toThrow(SessionBootstrapError);
    expect(() => verifyToken(numSub)).toThrow(/inválido/);
  });
});

// ---------------------------------------------------------------------------
// getResearcher
// ---------------------------------------------------------------------------

describe('getResearcher', () => {
  it('retorna dados públicos sem passwordHash', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue({
      id: 'res-001', name: 'Luiza Caldas', email: 'luiza@unb.br',
    } as never);
    const result = await getResearcher('res-001');
    expect(result.id).toBe('res-001');
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('researcher não encontrada → lança SessionBootstrapError', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(null as never);
    await expect(getResearcher('nao-existe')).rejects.toThrow(SessionBootstrapError);
    await expect(getResearcher('nao-existe')).rejects.toThrow(/não encontrada/);
  });
});

// ---------------------------------------------------------------------------
// login — normalização do e-mail
// ---------------------------------------------------------------------------

describe('login — e-mail normalizado', () => {
  it('busca a conta em minúsculas e sem espaços nas pontas', async () => {
    vi.mocked(prisma.researcher.findUnique).mockResolvedValue(mockResearcher as never);
    const result = await login('  Luiza@UnB.br ', 'senha123');

    expect(result.researcher.id).toBe('res-001');
    expect(vi.mocked(prisma.researcher.findUnique).mock.calls[0][0])
      .toMatchObject({ where: { email: 'luiza@unb.br' } });
  });

  it('normalizeEmail tira espaços e passa para minúsculas', () => {
    expect(normalizeEmail('  Ana.Souza@Exemplo.COM ')).toBe('ana.souza@exemplo.com');
  });
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

const createdResearcher = { id: 'res-new', name: 'Marina Costa', email: 'marina@exemplo.br' };

async function expectRegistrationError(promise: Promise<unknown>, status: number, message: RegExp) {
  const err = await promise.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(RegistrationError);
  expect((err as RegistrationError).status).toBe(status);
  expect((err as RegistrationError).message).toMatch(message);
}

describe('isRegistrationOpen', () => {
  it('segue env.registrationOpen', () => {
    expect(isRegistrationOpen()).toBe(true);
    (env as { registrationOpen: boolean }).registrationOpen = false;
    expect(isRegistrationOpen()).toBe(false);
  });
});

describe('register — sucesso', () => {
  it('cria a conta com nome sem espaços, e-mail em minúsculas e senha com hash', async () => {
    vi.mocked(prisma.researcher.create).mockResolvedValue(createdResearcher as never);
    const result = await register('  Marina Costa ', ' Marina@Exemplo.BR ', 'senha123');

    const args = vi.mocked(prisma.researcher.create).mock.calls[0][0] as {
      data: { name: string; email: string; passwordHash: string };
      select: Record<string, boolean>;
    };
    expect(args.data.name).toBe('Marina Costa');
    expect(args.data.email).toBe('marina@exemplo.br');
    expect(args.data.passwordHash).not.toBe('senha123');
    expect(bcrypt.compareSync('senha123', args.data.passwordHash)).toBe(true);
    expect(args.select.passwordHash).toBeUndefined();

    expect(result.researcher).toEqual(createdResearcher);
    expect((result.researcher as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('devolve JWT só com sub, como o login', async () => {
    vi.mocked(prisma.researcher.create).mockResolvedValue(createdResearcher as never);
    const { token } = await register('Marina Costa', 'marina@exemplo.br', 'senha123');
    const payload = jwt.verify(token, env.jwtSecret) as Record<string, unknown>;

    expect(payload.sub).toBe('res-new');
    expect(payload.email).toBeUndefined();
  });

  it('não faz trim na senha — entra com exatamente o que digitou', async () => {
    vi.mocked(prisma.researcher.create).mockResolvedValue(createdResearcher as never);
    await register('Marina Costa', 'marina@exemplo.br', ' senha 123 ');
    const { data } = vi.mocked(prisma.researcher.create).mock.calls[0][0] as { data: { passwordHash: string } };

    expect(bcrypt.compareSync(' senha 123 ', data.passwordHash)).toBe(true);
    expect(bcrypt.compareSync('senha 123', data.passwordHash)).toBe(false);
  });

  it('aceita senha com exatamente 8 caracteres', async () => {
    vi.mocked(prisma.researcher.create).mockResolvedValue(createdResearcher as never);
    await expect(register('Marina Costa', 'marina@exemplo.br', '12345678')).resolves.toBeTruthy();
  });

  it('aceita senha com exatamente 72 bytes', async () => {
    vi.mocked(prisma.researcher.create).mockResolvedValue(createdResearcher as never);
    await expect(register('Marina Costa', 'marina@exemplo.br', 'a'.repeat(72))).resolves.toBeTruthy();
  });
});

describe('register — cadastro fechado', () => {
  it('403 e não toca no banco', async () => {
    (env as { registrationOpen: boolean }).registrationOpen = false;
    await expectRegistrationError(
      register('Marina Costa', 'marina@exemplo.br', 'senha123'), 403, /cadastro está fechado/,
    );
    expect(prisma.researcher.create).not.toHaveBeenCalled();
  });

  it('fechado tem prioridade sobre campos inválidos', async () => {
    (env as { registrationOpen: boolean }).registrationOpen = false;
    await expectRegistrationError(register(undefined, undefined, undefined), 403, /fechado/);
  });
});

describe('register — validação (400)', () => {
  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['só espaços', '   '],
    ['não-string', 42],
  ])('nome %s', async (_label, name) => {
    await expectRegistrationError(register(name, 'marina@exemplo.br', 'senha123'), 400, /Informe seu nome/);
    expect(prisma.researcher.create).not.toHaveBeenCalled();
  });

  it('nome com mais de 120 caracteres', async () => {
    await expectRegistrationError(
      register('a'.repeat(121), 'marina@exemplo.br', 'senha123'), 400, /no máximo 120/,
    );
  });

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['sem @', 'marina.exemplo.br'],
    ['sem domínio', 'marina@'],
    ['sem ponto no domínio', 'marina@exemplo'],
    ['com espaço no meio', 'mari na@exemplo.br'],
    ['não-string', ['marina@exemplo.br']],
    ['longo demais', 'a'.repeat(250) + '@x.br'],
  ])('e-mail %s', async (_label, email) => {
    await expectRegistrationError(register('Marina Costa', email, 'senha123'), 400, /e-mail válido/);
    expect(prisma.researcher.create).not.toHaveBeenCalled();
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
    ['com 7 caracteres', '1234567'],
    ['não-string', 12345678],
  ])('senha %s', async (_label, password) => {
    await expectRegistrationError(register('Marina Costa', 'marina@exemplo.br', password), 400, /pelo menos 8/);
    expect(prisma.researcher.create).not.toHaveBeenCalled();
  });

  it('senha com mais de 72 bytes (o bcrypt ignoraria o resto)', async () => {
    await expectRegistrationError(
      register('Marina Costa', 'marina@exemplo.br', 'a'.repeat(73)), 400, /longa demais/,
    );
    // 37 letras acentuadas = 74 bytes em UTF-8, apesar de só 37 caracteres
    await expectRegistrationError(
      register('Marina Costa', 'marina@exemplo.br', 'á'.repeat(37)), 400, /longa demais/,
    );
    expect(prisma.researcher.create).not.toHaveBeenCalled();
  });
});

describe('register — e-mail repetido', () => {
  it('P2002 do banco vira 409 com mensagem amigável', async () => {
    vi.mocked(prisma.researcher.create).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    );
    await expectRegistrationError(
      register('Marina Costa', 'marina@exemplo.br', 'senha123'), 409, /já tem cadastro/,
    );
  });

  it('outro erro do banco é repassado sem virar RegistrationError', async () => {
    const boom = Object.assign(new Error('connection lost'), { code: 'P1001' });
    vi.mocked(prisma.researcher.create).mockRejectedValue(boom);
    await expect(register('Marina Costa', 'marina@exemplo.br', 'senha123')).rejects.toBe(boom);
  });
});
