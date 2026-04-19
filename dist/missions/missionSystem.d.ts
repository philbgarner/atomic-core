import { EventEmitter } from '../events/eventEmitter';
import { ActionTransport } from '../transport/types';
import { MissionsHandle } from './types';
/**
 * Create the mission system.
 *
 * @param events     Game event emitter — used to fire `mission-complete` on success.
 * @param transport  Optional multiplayer transport — used to broadcast completions to peers.
 * @returns          A `MissionsHandle` for adding, removing, and evaluating missions.
 */
export declare function createMissionSystem(events: EventEmitter, transport: ActionTransport | undefined): MissionsHandle;
//# sourceMappingURL=missionSystem.d.ts.map