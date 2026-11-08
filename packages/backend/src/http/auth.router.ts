/**
 * auth.router.ts
 * Rotas de autenticação da pesquisadora.
 *
 * POST /auth/login         — login com email/senha, retorna JWT
 * GET  /auth/me            — retorna dados da pesquisadora autenticada
 * GET  /auth/registration  — informa se o cadastro está aberto
 * POST /auth/register      — cria a conta (só com REGISTRATION_OPEN=true), retorna JWT
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { login, getResearcher, isRegistrationOpen, register } from '../services/auth.service';
import { researcherAuth } from './researcher-auth.middleware';
import { SessionBootstrapError } from '../services/session.drafts';
import { RegistrationError } from '../services/registration.error';

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'email é obrigatório.' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'password é obrigatório.' });
    return;
  }

  try {
    const result = await login(email, password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof SessionBootstrapError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

authRouter.get('/me', researcherAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const researcher = await getResearcher(req.researcherId!);
    res.status(200).json({ researcher });
  } catch (err) {
    if (err instanceof SessionBootstrapError) {
      // Token válido mas researcher deletada da base — improvável mas tratado
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /auth/registration
// ---------------------------------------------------------------------------

authRouter.get('/registration', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ open: isRegistrationOpen() });
});

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body ?? {};

  try {
    // Validação de conteúdo fica no service (testável e única fonte das mensagens)
    const result = await register(name, email, password);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof RegistrationError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});
