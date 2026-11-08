/**
 * auth.router.test.ts
 * Testes HTTP de /auth/login, /auth/me, /auth/registration e /auth/register com services mockados.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/http/app';

vi.mock('../../src/services/auth.service', () => ({
  login:              vi.fn(),
  verifyToken:        vi.fn(),
  getResearcher:      vi.fn(),
  isRegistrationOpen: vi.fn(),
  register:           vi.fn(),
}));

// Mocks das outras rotas para isolar app.ts
vi.mock('../../src/services/session.service', () => ({
  createSession: vi.fn(), addParticipant: vi.fn(),
  startSession:  vi.fn(), getSession: vi.fn(),
}));
vi.mock('../../src/services/participant.service', () => ({
  getParticipantState: vi.fn(), deriveStage: vi.fn(),
}));
vi.mock('../../src/services/response.service', () => ({
  submitJudgment: vi.fn(), submitPunishment: vi.fn(), submitAcknowledge: vi.fn(),
}));

import * as authService from '../../src/services/auth.service';
import { SessionBootstrapError } from '../../src/services/session.drafts';
import { RegistrationError } from '../../src/services/registration.error';

const BEARER = 'Bearer valid.jwt.token';

const mockLoginResult = {
  token: 'signed.jwt.token',
  researcher: { id: 'res-001', name: 'Luiza Caldas', email: 'luiza@unb.br' },
};

beforeEach(() => { vi.resetAllMocks(); });

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  it('200 com credenciais válidas — retorna token e researcher sem passwordHash', async () => {
    vi.mocked(authService.login).mockResolvedValue(mockLoginResult);
    const res = await request(app).post('/auth/login')
      .send({ email: 'luiza@unb.br', password: 'senha123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('signed.jwt.token');
    expect(res.body.researcher.id).toBe('res-001');
    expect(res.body.researcher.passwordHash).toBeUndefined();
    expect(authService.login).toHaveBeenCalledWith('luiza@unb.br', 'senha123');
  });

  it('400 sem email', async () => {
    const res = await request(app).post('/auth/login').send({ password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/);
  });

  it('400 sem password', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/);
  });

  it('400 sem body', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('401 com credenciais inválidas', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new SessionBootstrapError('Credenciais inválidas.')
    );
    const res = await request(app).post('/auth/login')
      .send({ email: 'luiza@unb.br', password: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Credenciais inválidas/);
  });

  it('400 para JSON malformado', async () => {
    const res = await request(app).post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{malformado}');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/malformado/i);
  });

  it('500 para erro inesperado', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('DB down'));
    const res = await request(app).post('/auth/login')
      .send({ email: 'a@b.com', password: 'x' });
    expect(res.status).toBe(500);
  });

  it('resposta não expõe passwordHash', async () => {
    vi.mocked(authService.login).mockResolvedValue(mockLoginResult);
    const res = await request(app).post('/auth/login')
      .send({ email: 'luiza@unb.br', password: 'senha123' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('Hash');
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

describe('GET /auth/me', () => {
  it('200 com token válido — retorna researcher sem passwordHash', async () => {
    vi.mocked(authService.verifyToken).mockReturnValue('res-001');
    vi.mocked(authService.getResearcher).mockResolvedValue(
      { id: 'res-001', name: 'Luiza Caldas', email: 'luiza@unb.br' }
    );
    const res = await request(app).get('/auth/me').set('Authorization', BEARER);

    expect(res.status).toBe(200);
    expect(res.body.researcher.id).toBe('res-001');
    expect(res.body.researcher.passwordHash).toBeUndefined();
    expect(authService.verifyToken).toHaveBeenCalledWith('valid.jwt.token');
    expect(authService.getResearcher).toHaveBeenCalledWith('res-001');
  });

  it('401 sem Authorization header', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authorization/i);
  });

  it('401 com header malformado (sem Bearer)', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/malformado|Bearer/i);
  });

  it('401 com token inválido', async () => {
    vi.mocked(authService.verifyToken).mockImplementation(() => {
      throw new SessionBootstrapError('Token JWT inválido ou expirado.');
    });
    const res = await request(app).get('/auth/me').set('Authorization', BEARER);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválido/);
  });

  it('401 quando researcher não encontrada (token válido mas researcher deletada)', async () => {
    vi.mocked(authService.verifyToken).mockReturnValue('res-deletada');
    vi.mocked(authService.getResearcher).mockRejectedValue(
      new SessionBootstrapError('Pesquisadora não encontrada.')
    );
    const res = await request(app).get('/auth/me').set('Authorization', BEARER);
    expect(res.status).toBe(401);
  });

  it('500 para erro inesperado', async () => {
    vi.mocked(authService.verifyToken).mockReturnValue('res-001');
    vi.mocked(authService.getResearcher).mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/auth/me').set('Authorization', BEARER);
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// GET /auth/registration
// ---------------------------------------------------------------------------

describe('GET /auth/registration', () => {
  it('200 { open: true } quando o cadastro está aberto, sem cache', async () => {
    vi.mocked(authService.isRegistrationOpen).mockReturnValue(true);
    const res = await request(app).get('/auth/registration');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ open: true });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('200 { open: false } quando o cadastro está fechado', async () => {
    vi.mocked(authService.isRegistrationOpen).mockReturnValue(false);
    const res = await request(app).get('/auth/registration');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ open: false });
  });

  it('não exige Authorization', async () => {
    vi.mocked(authService.isRegistrationOpen).mockReturnValue(true);
    const res = await request(app).get('/auth/registration');
    expect(res.status).toBe(200);
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

const mockRegisterResult = {
  token: 'signed.jwt.token',
  researcher: { id: 'res-new', name: 'Marina Costa', email: 'marina@exemplo.br' },
};

describe('POST /auth/register', () => {
  it('201 — devolve token e researcher, repassando os campos ao service', async () => {
    vi.mocked(authService.register).mockResolvedValue(mockRegisterResult);
    const res = await request(app).post('/auth/register')
      .send({ name: 'Marina Costa', email: 'marina@exemplo.br', password: 'senha123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('signed.jwt.token');
    expect(res.body.researcher.id).toBe('res-new');
    expect(res.body.researcher.passwordHash).toBeUndefined();
    expect(authService.register).toHaveBeenCalledWith('Marina Costa', 'marina@exemplo.br', 'senha123');
  });

  it('não exige Authorization', async () => {
    vi.mocked(authService.register).mockResolvedValue(mockRegisterResult);
    const res = await request(app).post('/auth/register')
      .send({ name: 'Marina Costa', email: 'marina@exemplo.br', password: 'senha123' });
    expect(res.status).toBe(201);
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it('403 quando o cadastro está fechado', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new RegistrationError(403, 'O cadastro está fechado no momento.'),
    );
    const res = await request(app).post('/auth/register')
      .send({ name: 'Marina Costa', email: 'marina@exemplo.br', password: 'senha123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('O cadastro está fechado no momento.');
  });

  it('400 com a mensagem de validação do service', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new RegistrationError(400, 'A senha precisa ter pelo menos 8 caracteres.'),
    );
    const res = await request(app).post('/auth/register')
      .send({ name: 'Marina Costa', email: 'marina@exemplo.br', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pelo menos 8/);
  });

  it('409 para e-mail já cadastrado', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new RegistrationError(409, 'Este e-mail já tem cadastro. Tente entrar.'),
    );
    const res = await request(app).post('/auth/register')
      .send({ name: 'Marina Costa', email: 'marina@exemplo.br', password: 'senha123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/já tem cadastro/);
  });

  it('sem body — o service recebe undefined e decide a resposta', async () => {
    vi.mocked(authService.register).mockRejectedValue(new RegistrationError(400, 'Informe seu nome.'));
    const res = await request(app).post('/auth/register');

    expect(res.status).toBe(400);
    expect(authService.register).toHaveBeenCalledWith(undefined, undefined, undefined);
  });

  it('400 para JSON malformado', async () => {
    const res = await request(app).post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{nome: ');
    expect(res.status).toBe(400);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('500 para erro inesperado', async () => {
    vi.mocked(authService.register).mockRejectedValue(new Error('boom'));
    const res = await request(app).post('/auth/register')
      .send({ name: 'Marina Costa', email: 'marina@exemplo.br', password: 'senha123' });
    expect(res.status).toBe(500);
  });
});
