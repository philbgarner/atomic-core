export type ActionKind = string;
export type ActionContext<TAction = {
    kind: ActionKind;
}, TActor = unknown, TState = unknown> = {
    action: TAction;
    actorId: string;
    actor: TActor;
    state: TState;
};
export type ActionMiddlewareResult<TState> = {
    pass: true;
    state?: TState;
} | {
    pass: false;
    reason?: string;
};
export type ActionMiddleware<TAction = {
    kind: ActionKind;
}, TActor = unknown, TState = unknown> = (ctx: ActionContext<TAction, TActor, TState>, next: () => ActionMiddlewareResult<TState>) => ActionMiddlewareResult<TState>;
export type ActionPipeline<TAction, TActor, TState> = {
    /** Append a middleware. Middlewares run in registration order. */
    use(middleware: ActionMiddleware<TAction, TActor, TState>): void;
    /**
     * Run all registered middlewares for the given context.
     * Returns the final result after all middlewares have run (or the first veto).
     */
    run(ctx: ActionContext<TAction, TActor, TState>): ActionMiddlewareResult<TState>;
};
/** Create a new empty action pipeline. */
export declare function createActionPipeline<TAction = {
    kind: ActionKind;
}, TActor = unknown, TState = unknown>(): ActionPipeline<TAction, TActor, TState>;
//# sourceMappingURL=actions.d.ts.map