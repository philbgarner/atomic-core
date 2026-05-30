// src/lib/turn/scheduler.ts
//
// RogueBasin-style priority queue scheduler using absolute timestamps.
//
// Key design: store absolute timestamps (not relative delays) to avoid O(n)
// adjustment per tick. Lazy cancellation handles removal efficiently.
//
// Reference: https://roguebasin.com/index.php/A_priority_queue_based_turn_scheduling_system

import type { ActorId } from "./types";

// ---------------------------------------------------------------------------
// MinHeap (internal — not exported; Phase 3 BSP helpers provide their own)
// ---------------------------------------------------------------------------

class MinHeap<T> {
	private _heap: T[] = [];

	constructor(
		private readonly compare: (a: T, b: T) => number
	) { }

	get size(): number {
		return this._heap.length;
	}

	push(value: T): void {
		this._heap.push(value);
		this._bubbleUp(this._heap.length - 1);
	}

	pop(): T | undefined {
		if (this._heap.length === 0) return undefined;

		const top = this._heap[0]!;
		const last = this._heap.pop()!;

		if (this._heap.length > 0) {
			this._heap[0] = last;
			this._siftDown(0);
		}

		return top;
	}

	private _bubbleUp(i: number): void {
		while (i > 0) {
			const parent = (i - 1) >> 1;

			if (this.compare(this._heap[parent]!, this._heap[i]!) <= 0) {
				break;
			}

			[this._heap[parent], this._heap[i]] =
				[this._heap[i]!, this._heap[parent]!];

			i = parent;
		}
	}

	private _siftDown(i: number): void {
		const n = this._heap.length;

		while (true) {
			let smallest = i;

			const l = 2 * i + 1;
			const r = 2 * i + 2;

			if (
				l < n &&
				this.compare(this._heap[l]!, this._heap[smallest]!) < 0
			) {
				smallest = l;
			}

			if (
				r < n &&
				this.compare(this._heap[r]!, this._heap[smallest]!) < 0
			) {
				smallest = r;
			}

			if (smallest === i) {
				break;
			}

			[this._heap[smallest], this._heap[i]] =
				[this._heap[i]!, this._heap[smallest]!];

			i = smallest;
		}
	}
}

// ---------------------------------------------------------------------------
// TurnScheduler
// ---------------------------------------------------------------------------

type Scheduled = {
	actorId: ActorId;
	at: number;
	seq: number;
	generation: number;
};

export class TurnScheduler {
	private generation = 0;
	private heap = new MinHeap<Scheduled>((a, b) => {
		if (a.generation !== b.generation) {
			return a.generation - b.generation;
		}

		if (a.at !== b.at) {
			return a.at - b.at;
		}

		return a.seq - b.seq;
	});

	private now = 0;
	private seq = 0;
	private cancelled = new Set<ActorId>();

	/** Schedule an actor to act at now + delay. */
	add(actorId: ActorId, delay: number): void {
		const generation =
			delay === 0 ? --this.generation : 0;

		this.heap.push({
			actorId,
			at: this.now + delay,
			seq: this.seq++,
			generation,
		});
	}

	/** Lazily remove an actor from the schedule. */
	remove(actorId: ActorId): void {
		this.cancelled.add(actorId);
	}

	/** Re-add a cancelled actor (un-cancels it too). */
	restore(actorId: ActorId): void {
		this.cancelled.delete(actorId);
	}

	/**
	 * Pop the next actor whose turn it is.
	 * Advances now to the actor's scheduled time.
	 * Returns null if the schedule is empty.
	 */
	next(): { actorId: ActorId; now: number } | null {
		while (this.heap.size > 0) {
			const entry = this.heap.pop()!;

			if (this.cancelled.has(entry.actorId)) {
				this.cancelled.delete(entry.actorId);
				continue;
			}

			this.now = entry.at;

			return {
				actorId: entry.actorId,
				now: this.now,
			};
		}

		return null;
	}

	/** Re-schedule an actor after it has acted. */
	reschedule(actorId: ActorId, delay: number): void {
		this.add(actorId, delay);
	}

	/** Return the current absolute time (updated by `next()`). */
	getNow(): number {
		return this.now;
	}

	get size(): number {
		return this.heap.size;
	}
}