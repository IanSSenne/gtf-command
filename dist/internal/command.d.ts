import { Location } from "mojang-minecraft";
import { ArgumentMatcher, ArgumentResult, CommandContext } from "./ArgumentMatcher";
declare type discard = never;
declare type AppendArgument<Base, Next> = Base extends (ctx: infer X, ...args: infer E) => infer R ? (ctx: X, ...args: [...E, Next]) => R : never;
declare type Arguments<Fn> = Fn extends (...args: infer E) => any ? E : never;
declare type GuessTypeBasedOnArgumentResultType<T extends ArgumentResult<any>> = T extends {
    value: infer U;
} ? U extends {
    success: false;
} ? discard : U : discard;
export declare type CommandResult = {
    success: true;
    executionSuccess: boolean;
    executionError?: any;
} | {
    success: false;
    error: string;
    depth?: number | undefined;
};
export declare class StringArgumentMatcher extends ArgumentMatcher {
    private greedy;
    constructor(greedy?: boolean);
    matches(value: string): ArgumentResult<string>;
    getCompletion(): string;
}
export declare class NumberArgumentMatcher extends ArgumentMatcher {
    constructor();
    matches(value: string): ArgumentResult<number>;
    getCompletion(): string;
}
declare enum InternalCallType {
    __add = 0,
    __redirect = 1,
    __getDescription = 2,
    __getMatcher = 3,
    __evaluate = 4,
    __isExecutable = 5,
    __getActions = 6,
    __getParent = 7
}
declare class ArgumentBuilder<HandlerFn extends Function = (ctx: CommandContext) => void> {
    private readonly matcher;
    private actions;
    private depth;
    private executable?;
    private parent;
    private _description;
    constructor(matcher?: ArgumentMatcher);
    _internalCall<T extends InternalCallType, X extends (...args: any) => any = T extends InternalCallType.__add ? ArgumentBuilder["__add"] : T extends InternalCallType.__redirect ? ArgumentBuilder["__redirect"] : T extends InternalCallType.__getDescription ? ArgumentBuilder["__getDescription"] : T extends InternalCallType.__getMatcher ? ArgumentBuilder["__getMatcher"] : T extends InternalCallType.__evaluate ? ArgumentBuilder["__evaluate"] : T extends InternalCallType.__isExecutable ? ArgumentBuilder["__isExecutable"] : T extends InternalCallType.__getActions ? ArgumentBuilder["__getActions"] : T extends InternalCallType.__getParent ? ArgumentBuilder["__getParent"] : (...args: any[]) => any>(Method: T, ...args: Arguments<X>): ReturnType<X>;
    private __isExecutable;
    private __getDescription;
    private __getMatcher;
    private __getActions;
    private bind;
    private setDepth;
    private __getParent;
    private get root();
    /**
     *
     * @param target
     * @private
     */
    private __add;
    /**
     *
     * @param target
     * @private
     */
    private __redirect;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("hello").literal("world")
     * ```
     * @param value the literal value to match against
     * @returns
     */
    literal(value: string): ArgumentBuilder<HandlerFn>;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("roll").number("count")
     * ```
     * this would match `roll 14` and provide `14` as the count
     *
     * @param name
     * @returns
     */
    number(name: string): ArgumentBuilder<AppendArgument<HandlerFn, number>>;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("roll").string("pattern")
     * ```
     * this would match `roll 1d20` and provide `1d20` as the pattern
     *
     * @param name
     * @returns
     */
    string(name: string, greedy?: boolean): ArgumentBuilder<AppendArgument<HandlerFn, string>>;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("setblock").position("pattern")
     * ```
     * this would match `roll 1 1 1` and provide `Location{x:1,y:1,z:1}` as the pattern
     * also supports `~` for relative to the source position
     * and `^` for local coordinates
     *
     * @param name
     * @returns
     */
    position(name: string): ArgumentBuilder<AppendArgument<HandlerFn, Location>>;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("roll").argument("count",new NumberArgumentMatcher())
     * ```
     * this would match `roll 14` and provide `14` as the count as a number
     *
     * @param name
     * @param matcher
     * @returns
     **/
    argument<ArgumentType extends ArgumentMatcher>(name: string, matcher: ArgumentType): ArgumentBuilder<AppendArgument<HandlerFn, GuessTypeBasedOnArgumentResultType<ReturnType<ArgumentType["matches"]>>>>;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.requires((ctx)=>ctx.sender.hasTag("admin"),"You must be an admin to execute this command.").executes((ctx:CommandContext)=>{
     * 	console.warn(`success`);
     * })
     * ```
     * tells the command parser that the particular path is only accessible if the context meets a criteria
     * @param condition
     * @param message
     * @returns
     **/
    requires(fn: (ctx: CommandContext) => boolean, error: string, isConsideredInHelp?: boolean): ArgumentBuilder<HandlerFn>;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("roll").number("count").executes((ctx:CommandContext,count:number)=>{
     * 	console.warn(`the count is ${count}`);
     * })
     * ```
     * tells the command parser that the particular path is executable and privide a function to execute.
     * @param handler
     * @returns
     **/
    executes(callback: HandlerFn): ArgumentBuilder<HandlerFn>;
    /**
     * @example
     * ArgumentBuilderInstance.literal("roll").description("rolls a die")
     * @param description
     * @returns
     *
     */
    description(description: string): this;
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.evaluate(ctx,"roll 1d20")
     * ```
     * this would evaluate the command and return the result
     * @param ctx
     * @param command
     * @returns
     **/
    private __evaluate;
}
export declare const commandRoot: ArgumentBuilder<(ctx: CommandContext) => void>;
export declare function getPossibleCompletions(ctx: CommandContext): void;
export declare function registerCommand(command: ArgumentBuilder, alias?: string[]): void;
export declare function literal(value: string): ArgumentBuilder;
declare let config: {
    commandIndicator: string;
    disableDefaultChatHandler: boolean;
};
export declare function updateConfig(configUpdate: Partial<typeof config>): void;
export {};
