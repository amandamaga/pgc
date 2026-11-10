/**
 * session.router.ts
 * Endpoints HTTP de gerenciamento de sessões.
 * Todas as rotas exigem autenticação JWT da pesquisadora.
 * researcherId vem sempre de req.researcherId (JWT), nunca do body.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  addParticipant,
  createSession,
  deleteSession,
  getSession,
  getSessionPanel,
  getParticipantAccess,
  listSessions,
  startSession,
} from '../services/session.service';
import { researcherAuth } from './researcher-auth.middleware';
import {
  isBlockConditions,
  SEQUENCE_PRESETS,
  type BlockConditions,
  type SequencePreset,
} from '../domain/experiment.types';
import { buildExportRows } from '../services/export.service';
import { serializeExportCsv } from '../services/export.csv';
import { serializeModelExportCsv } from '../services/export.model.csv';

export const sessionRouter = Router();

// Todas as rotas exigem JWT válido da pesquisadora
sessionRouter.use(researcherAuth);

const VALID_SLOTS = ['P1', 'P2'];

// ---------------------------------------------------------------------------
// GET /sessions  — lista sessões da pesquisadora autenticada
// ---------------------------------------------------------------------------

sessionRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await listSessions(req.researcherId!);
    res.status(200).json(sessions);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /sessions
// Body: { name, blockConditions: ['A','B','A','C'] } — condição de cada um dos
// 4 blocos, qualquer combinação de A, B e C, com repetição.
// Transição (F8): também aceita { name, sequenceVariant: 'ABAC' | 'ACAB' |
// 'BCBC' | 'CBCB' }, convertido pelo atalho, para o frontend anterior não
// quebrar entre os deploys. Se os dois vierem, vale blockConditions.
// ---------------------------------------------------------------------------

const BLOCK_CONDITIONS_ERROR =
  'blockConditions deve ter 4 condições, cada uma A, B ou C (ex.: ["A","B","A","C"]).';

function resolveBlockConditions(body: Record<string, unknown>): BlockConditions | null {
  if (body['blockConditions'] !== undefined) {
    return isBlockConditions(body['blockConditions'])
      ? ([...body['blockConditions']] as BlockConditions)
      : null;
  }
  const preset = body['sequenceVariant'];
  if (typeof preset === 'string' && Object.hasOwn(SEQUENCE_PRESETS, preset)) {
    return [...SEQUENCE_PRESETS[preset as SequencePreset]] as BlockConditions;
  }
  return null;
}

sessionRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const { name } = body;
  // researcherId vem do JWT — body.researcherId é ignorado

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name é obrigatório.' });
    return;
  }
  const blockConditions = resolveBlockConditions(body);
  if (!blockConditions) {
    res.status(400).json({ error: BLOCK_CONDITIONS_ERROR });
    return;
  }

  try {
    const session = await createSession(req.researcherId!, name, blockConditions);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /sessions/:sessionId/participants
// ---------------------------------------------------------------------------

sessionRouter.post('/:sessionId/participants', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  const { slot, displayName, participantCode } = req.body ?? {};

  if (!slot || !VALID_SLOTS.includes(slot)) {
    res.status(400).json({ error: `slot deve ser P1 ou P2.` });
    return;
  }
  if (!displayName || typeof displayName !== 'string') {
    res.status(400).json({ error: 'displayName é obrigatório.' });
    return;
  }
  if (!participantCode || typeof participantCode !== 'string') {
    res.status(400).json({ error: 'participantCode é obrigatório.' });
    return;
  }

  try {
    const participant = await addParticipant(
      sessionId, req.researcherId!, slot as 'P1' | 'P2', displayName, participantCode
    );
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /sessions/:sessionId/start
// ---------------------------------------------------------------------------

sessionRouter.post('/:sessionId/start', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const session = await startSession(sessionId, req.researcherId!);
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions/:sessionId
// ---------------------------------------------------------------------------

sessionRouter.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const session = await getSession(sessionId, req.researcherId!);
    if (!session) {
      res.status(404).json({ error: `Session não encontrada: ${sessionId}` });
      return;
    }
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /sessions/:sessionId — só sessões em WAITING (sem dado de criança)
// 200 { id } · 404 inexistente ou de outra pesquisadora · 409 já iniciada.
// Responde 200 com corpo (não 204) porque o cliente do front exige JSON.
// ---------------------------------------------------------------------------

sessionRouter.delete('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const deleted = await deleteSession(sessionId, req.researcherId!);
    res.status(200).json(deleted);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions/:sessionId/panel
// ---------------------------------------------------------------------------

sessionRouter.get('/:sessionId/panel', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const panel = await getSessionPanel(sessionId, req.researcherId!);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(panel);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions/:sessionId/participant-access
// ---------------------------------------------------------------------------

sessionRouter.get('/:sessionId/participant-access', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const access = await getParticipantAccess(sessionId, req.researcherId!);
    res.status(200).json(access);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions/:sessionId/export.csv
// ---------------------------------------------------------------------------

sessionRouter.get('/:sessionId/export.csv', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const rows = await buildExportRows(sessionId, req.researcherId!);
    const csv  = serializeExportCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions/:sessionId/export-model.csv
// ---------------------------------------------------------------------------

sessionRouter.get('/:sessionId/export-model.csv', async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.params['sessionId'] as string;
  try {
    const rows = await buildExportRows(sessionId, req.researcherId!);
    const csv  = serializeModelExportCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}-model.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});
