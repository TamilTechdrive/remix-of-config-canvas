import { Router, Request, Response } from 'express';
import { db } from '../database/connection.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ProcessedFile {
  FileType: number;
  FName: string;
  FNameFull: string;
  StartTS: number;
  EndTS: number;
  TimeDelta: number;
  InpLC: number;
  UsedLC: number;
  EmpCmtLC: number;
  MultLC: number;
  MaxLL: number;
  MinLL: number;
  MaxLNR: string;
  MinLNR: string;
  CondIf: number;
  CondElse: number;
  CondElif: number;
  CondEndif: number;
  CondNestBlk: number;
  AssignDir: number;
  AssignRHS: number;
  DefVarCnt: number;
  DefHitCnt: number;
  UndefHitCnt: number;
  CtlDefHitCnt: number;
  MacroHitCnt: number;
}

interface DefineVar {
  '1stHitInfo': {
    VarType: string;
    HitSrcScope: string;
    HitSLNR: string;
    CondOrd?: {
      OrdDepth: number;
      CondDir: string;
      CondSLNR: string;
    };
  };
  AllHitInfo: Array<{
    HitMode?: string;
    VarType?: string;
    Depth?: number;
    HitSLNR?: string;
  }>;
  ParList: string[];
  SibList: string[];
  ChList: string[];
  ValEntries: Record<string, string[]>;
}

interface ParserJSON {
  ProcessedFiles: ProcessedFile[];
  IncludedFiles: Array<{ IncFName: string; SrcLineRef: string }>;
  DefineVars: Record<string, DefineVar>;
}

// ── Seed from uploaded JSON or built-in sample ──
router.post('/seed', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || null;
  const { jsonData, sessionName } = req.body;

  let parserData: ParserJSON;

  if (jsonData) {
    parserData = jsonData;
  } else {
    // Use built-in sample
    const samplePath = path.resolve(__dirname, '../data/MakeOptCCPPFileParser.json');
    if (!fs.existsSync(samplePath)) {
      return res.status(404).json({ error: 'Sample JSON file not found' });
    }
    parserData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
  }

  try {
    const result = await db.transaction(async (trx) => {
      const sessionId = uuid();

      // Create session
      await trx('parser_sessions').insert({
        id: sessionId,
        session_name: sessionName || `Parser Import ${new Date().toISOString()}`,
        source_file_name: 'MakeOptCCPPFileParser.json',
        total_processed_files: parserData.ProcessedFiles?.length || 0,
        total_included_files: parserData.IncludedFiles?.length || 0,
        total_define_vars: Object.keys(parserData.DefineVars || {}).length,
        created_by: userId,
      });

      // Seed ProcessedFiles
      if (parserData.ProcessedFiles?.length) {
        const rows = parserData.ProcessedFiles.map((f) => ({
          id: uuid(),
          session_id: sessionId,
          file_type: f.FileType,
          file_name: f.FName,
          file_name_full: f.FNameFull,
          start_ts: f.StartTS,
          end_ts: f.EndTS,
          time_delta: f.TimeDelta,
          input_line_count: f.InpLC,
          used_line_count: f.UsedLC,
          empty_comment_line_count: f.EmpCmtLC,
          multi_line_count: f.MultLC,
          max_line_length: f.MaxLL,
          min_line_length: f.MinLL,
          max_line_ref: f.MaxLNR,
          min_line_ref: f.MinLNR,
          cond_if: f.CondIf,
          cond_else: f.CondElse,
          cond_elif: f.CondElif,
          cond_endif: f.CondEndif,
          cond_nest_block: f.CondNestBlk,
          assign_direct: f.AssignDir,
          assign_rhs: f.AssignRHS,
          def_var_count: f.DefVarCnt,
          def_hit_count: f.DefHitCnt,
          undef_hit_count: f.UndefHitCnt,
          ctl_def_hit_count: f.CtlDefHitCnt,
          macro_hit_count: f.MacroHitCnt,
        }));
        await trx('parser_processed_files').insert(rows);
      }

      // Seed IncludedFiles
      if (parserData.IncludedFiles?.length) {
        const rows = parserData.IncludedFiles.map((inc) => ({
          id: uuid(),
          session_id: sessionId,
          include_file_name: inc.IncFName,
          source_line_ref: inc.SrcLineRef,
        }));
        await trx('parser_included_files').insert(rows);
      }

      // Seed DefineVars
      if (parserData.DefineVars) {
        for (const [varName, varData] of Object.entries(parserData.DefineVars)) {
          const defVarId = uuid();
          const firstHit = varData['1stHitInfo'];

          await trx('parser_define_vars').insert({
            id: defVarId,
            session_id: sessionId,
            var_name: varName,
            first_hit_var_type: firstHit?.VarType || null,
            first_hit_src_scope: firstHit?.HitSrcScope || null,
            first_hit_slnr: firstHit?.HitSLNR || null,
            cond_ord_depth: firstHit?.CondOrd?.OrdDepth || null,
            cond_ord_dir: firstHit?.CondOrd?.CondDir || null,
            cond_ord_slnr: firstHit?.CondOrd?.CondSLNR || null,
          });

          // AllHitInfo
          if (varData.AllHitInfo?.length) {
            for (const hit of varData.AllHitInfo) {
              await trx('parser_define_var_hits').insert({
                id: uuid(),
                define_var_id: defVarId,
                hit_mode: hit.HitMode || null,
                var_type: hit.VarType || null,
                depth: hit.Depth || null,
                hit_slnr: hit.HitSLNR || null,
              });
            }
          }

          // Relations: ParList, SibList, ChList
          for (const [relType, list] of [
            ['parent', varData.ParList],
            ['sibling', varData.SibList],
            ['child', varData.ChList],
          ] as [string, string[]][]) {
            if (list?.length) {
              for (const relName of list) {
                await trx('parser_define_var_relations').insert({
                  id: uuid(),
                  define_var_id: defVarId,
                  relation_type: relType,
                  related_var_name: relName,
                });
              }
            }
          }

          // ValEntries
          if (varData.ValEntries && Object.keys(varData.ValEntries).length) {
            for (const [valKey, valItems] of Object.entries(varData.ValEntries)) {
              await trx('parser_define_var_values').insert({
                id: uuid(),
                define_var_id: defVarId,
                value_key: valKey,
                value_items: JSON.stringify(valItems),
              });
            }
          }
        }
      }

      return { sessionId, stats: {
        processedFiles: parserData.ProcessedFiles?.length || 0,
        includedFiles: parserData.IncludedFiles?.length || 0,
        defineVars: Object.keys(parserData.DefineVars || {}).length,
      }};
    });

    // Audit
    await db('audit_logs').insert({
      user_id: userId,
      event: 'PARSER_DATA_SEEDED',
      resource: 'parser_sessions',
      resource_id: result.sessionId,
      details: JSON.stringify(result.stats),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    logger.error('Parser seed failed', { error });
    res.status(500).json({ error: 'Failed to seed parser data' });
  }
});

// ── List sessions ──
router.get('/sessions', requireAuth, async (_req: Request, res: Response) => {
  try {
    const sessions = await db('parser_sessions').orderBy('created_at', 'desc');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// ── Get session detail ──
router.get('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const session = await db('parser_sessions').where({ id }).first();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const processedFiles = await db('parser_processed_files').where({ session_id: id });
    const includedFiles = await db('parser_included_files').where({ session_id: id });
    const defineVars = await db('parser_define_vars').where({ session_id: id });

    // Enrich define vars with relations and hits
    const enrichedVars = await Promise.all(defineVars.map(async (dv: any) => {
      const hits = await db('parser_define_var_hits').where({ define_var_id: dv.id });
      const relations = await db('parser_define_var_relations').where({ define_var_id: dv.id });
      const values = await db('parser_define_var_values').where({ define_var_id: dv.id });
      return {
        ...dv,
        allHits: hits,
        parents: relations.filter((r: any) => r.relation_type === 'parent').map((r: any) => r.related_var_name),
        siblings: relations.filter((r: any) => r.relation_type === 'sibling').map((r: any) => r.related_var_name),
        children: relations.filter((r: any) => r.relation_type === 'child').map((r: any) => r.related_var_name),
        valEntries: values,
      };
    }));

    res.json({ session, processedFiles, includedFiles, defineVars: enrichedVars });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// ── Delete session ──
router.delete('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db('parser_sessions').where({ id }).del();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// ── Export session as Excel-compatible CSV ──
router.get('/sessions/:id/export', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sheet } = req.query; // processedFiles | includedFiles | defineVars | summary

  try {
    const session = await db('parser_sessions').where({ id }).first();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    let csvContent = '';
    let fileName = 'export';

    if (sheet === 'processedFiles' || !sheet) {
      const rows = await db('parser_processed_files').where({ session_id: id });
      csvContent = generateCSV(rows, [
        'file_name', 'file_name_full', 'file_type', 'input_line_count', 'used_line_count',
        'empty_comment_line_count', 'multi_line_count', 'max_line_length', 'min_line_length',
        'max_line_ref', 'min_line_ref', 'cond_if', 'cond_else', 'cond_elif', 'cond_endif',
        'cond_nest_block', 'assign_direct', 'assign_rhs', 'def_var_count', 'def_hit_count',
        'undef_hit_count', 'ctl_def_hit_count', 'macro_hit_count', 'time_delta',
      ]);
      fileName = 'processed_files';
    } else if (sheet === 'includedFiles') {
      const rows = await db('parser_included_files').where({ session_id: id });
      csvContent = generateCSV(rows, ['include_file_name', 'source_line_ref']);
      fileName = 'included_files';
    } else if (sheet === 'defineVars') {
      const rows = await db('parser_define_vars').where({ session_id: id });
      csvContent = generateCSV(rows, [
        'var_name', 'first_hit_var_type', 'first_hit_src_scope', 'first_hit_slnr',
        'cond_ord_depth', 'cond_ord_dir', 'cond_ord_slnr',
      ]);
      fileName = 'define_vars';
    } else if (sheet === 'summary') {
      const processedFiles = await db('parser_processed_files').where({ session_id: id });
      const totalLines = processedFiles.reduce((s: number, f: any) => s + (f.input_line_count || 0), 0);
      const totalCondIf = processedFiles.reduce((s: number, f: any) => s + (f.cond_if || 0), 0);
      const totalDefHits = processedFiles.reduce((s: number, f: any) => s + (f.def_hit_count || 0), 0);
      const defineVarCount = await db('parser_define_vars').where({ session_id: id }).count('* as cnt').first();
      const includedCount = await db('parser_included_files').where({ session_id: id }).count('* as cnt').first();

      csvContent = [
        'Metric,Value',
        `Session Name,${escCSV(session.session_name)}`,
        `Source File,${escCSV(session.source_file_name)}`,
        `Total Processed Files,${processedFiles.length}`,
        `Total Included Files,${(includedCount as any)?.cnt || 0}`,
        `Total Define Variables,${(defineVarCount as any)?.cnt || 0}`,
        `Total Input Lines,${totalLines}`,
        `Total Conditional #if,${totalCondIf}`,
        `Total Define Hits,${totalDefHits}`,
        `Created At,${session.created_at}`,
      ].join('\n');
      fileName = 'summary';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}_${id.slice(0, 8)}.csv"`);
    res.send('\uFEFF' + csvContent); // BOM for Excel compatibility
  } catch (error) {
    logger.error('Export failed', { error });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

function escCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generateCSV(rows: any[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => escCSV(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

export default router;
