/**
 * participant.router.ts
 * Endpoints do participante: acesso, respostas, ack de resultado e marcos
 * de tempo da tentativa (story-shown, next-story-available).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { bearerAuth } from './auth.middleware';
import { getParticipantState } from '../services/participant.service';
import {
  submitJudgment,
  submitPunishment,
  submitAcknowledge,
  markStoryShown,
  markNextStoryAvailable,
} from '../services/response.service';
import { SessionBootstrapError } from '../services/session.drafts';

export const participantRouter = Router();

const VALID_JUDGMENTS   = ['Just', 'Unjust']    as const;
const VALID_PUNISHMENTS = ['Punish', 'NoPunish'] as const;

function httpStatus(err: SessionBootstrapError): number {
  const msg = err.message;
  if (msg.includes('não encontrado') || msg.includes('não encontrada')) return 404;
  return 409;
}

// GET /participant/me
participantRouter.get('/me', bearerAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await getParticipantState(req.accessToken!);
    res.status(200).json(state);
  } catch (err) {
    if (err instanceof SessionBootstrapError) { res.status(401).json({ error: err.message }); return; }
    next(err);
  }
});

// POST /participant/attempts/:attemptId/judgment
participantRouter.post(
  '/attempts/:attemptId/judgment', bearerAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const attemptId = req.params['attemptId'] as string;
    const { judgment } = req.body ?? {};
    if (!judgment || !VALID_JUDGMENTS.includes(judgment)) {
      res.status(400).json({ error: 'judgment deve ser "Just" ou "Unjust".' }); return;
    }
    try {
      const state = await submitJudgment(req.accessToken!, attemptId, judgment);
      res.status(200).json(state);
    } catch (err) {
      if (err instanceof SessionBootstrapError) {
        const isToken = err.message.includes('Token inválido');
        res.status(isToken ? 401 : httpStatus(err)).json({ error: err.message }); return;
      }
      next(err);
    }
  },
);

// POST /participant/attempts/:attemptId/punishment
participantRouter.post(
  '/attempts/:attemptId/punishment', bearerAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const attemptId = req.params['attemptId'] as string;
    const { punishment } = req.body ?? {};
    if (!punishment || !VALID_PUNISHMENTS.includes(punishment)) {
      res.status(400).json({ error: 'punishment deve ser "Punish" ou "NoPunish".' }); return;
    }
    try {
      const state = await submitPunishment(req.accessToken!, attemptId, punishment);
      res.status(200).json(state);
    } catch (err) {
      if (err instanceof SessionBootstrapError) {
        const isToken = err.message.includes('Token inválido');
        res.status(isToken ? 401 : httpStatus(err)).json({ error: err.message }); return;
      }
      next(err);
    }
  },
);

// POST /participant/attempts/:attemptId/result/acknowledge
participantRouter.post(
  '/attempts/:attemptId/result/acknowledge', bearerAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const attemptId = req.params['attemptId'] as string;
    try {
      const state = await submitAcknowledge(req.accessToken!, attemptId);
      res.status(200).json(state);
    } catch (err) {
      if (err instanceof SessionBootstrapError) {
        const isToken = err.message.includes('Token inválido');
        res.status(isToken ? 401 : httpStatus(err)).json({ error: err.message }); return;
      }
      next(err);
    }
  },
);

// POST /participant/attempts/:attemptId/story-shown
// Sem body. Registra (horário do servidor, first-write) quando a história
// completa ficou visível para esta criança.
participantRouter.post(
  '/attempts/:attemptId/story-shown', bearerAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const attemptId = req.params['attemptId'] as string;
    try {
      const state = await markStoryShown(req.accessToken!, attemptId);
      res.status(200).json(state);
    } catch (err) {
      if (err instanceof SessionBootstrapError) {
        const isToken = err.message.includes('Token inválido');
        res.status(isToken ? 401 : httpStatus(err)).json({ error: err.message }); return;
      }
      next(err);
    }
  },
);

// POST /participant/attempts/:attemptId/next-story-available
// Sem body. Registra (horário do servidor, first-write) quando o avanço para a
// próxima história ficou disponível para esta criança. Só após a finalização.
participantRouter.post(
  '/attempts/:attemptId/next-story-available', bearerAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const attemptId = req.params['attemptId'] as string;
    try {
      const state = await markNextStoryAvailable(req.accessToken!, attemptId);
      res.status(200).json(state);
    } catch (err) {
      if (err instanceof SessionBootstrapError) {
        const isToken = err.message.includes('Token inválido');
        res.status(isToken ? 401 : httpStatus(err)).json({ error: err.message }); return;
      }
      next(err);
    }
  },
);
