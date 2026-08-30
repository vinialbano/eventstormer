import type { Operation } from '../schema/index.ts'
import { evolve } from './evolve.ts'
import { type BoardSnapshot, type BoardWriteModel, emptySnapshot, emptyWriteModel } from './model.ts'
import { project } from './project.ts'

/**
 * Rebuild the read-model snapshot by folding the whole operation log from empty
 * (F01: "replaying the operation log from empty reproduces the current snapshot
 * exactly"). No snapshot cache in v1 (docs/adr/004).
 */
export const replay = (log: Operation[]): BoardSnapshot => log.reduce(project, emptySnapshot())

/**
 * Rebuild the slim write model by folding the log — what an append path folds
 * before calling `decide`.
 */
export const replayWriteModel = (log: Operation[]): BoardWriteModel =>
  log.reduce(evolve, emptyWriteModel())
