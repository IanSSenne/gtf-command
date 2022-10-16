import { Location, world } from "mojang-minecraft";
import {
  ArgumentMatcher,
  ArgumentResult,
  CommandContext,
} from "./ArgumentMatcher";
import { PositionArgumentMatcher } from "./arguments/PositionArgument";
type discard = never;
type AppendArgument<Base, Next> = Base extends (
  ctx: infer X,
  ...args: infer E
) => infer R
  ? (ctx: X, ...args: [...E, Next]) => R
  : never;
type Arguments<Fn> = Fn extends (...args: infer E) => any ? E : never;
type GuessTypeBasedOnArgumentResultType<T extends ArgumentResult<any>> =
  T extends { value: infer U }
    ? U extends { success: false }
      ? discard
      : U
    : discard;
export type CommandResult =
  | {
      success: true;
      executionSuccess: boolean;
      executionError?: any;
    }
  | {
      success: false;
      error: string;
      depth?: number | undefined;
    };
class RootArgumentMatcher {
  name!: string;
  matches(_value: string): ArgumentResult<any> {
    return {
      success: true,
      value: "",
      raw: "",
      push: false,
    };
  }
  setName(name: string): this {
    this.name = name;
    return this;
  }
  getCompletion(): string {
    return "";
  }
}
class VoidArgumentMatcher extends ArgumentMatcher {
  matches(_value: string): ArgumentResult<any> {
    return {
      success: true,
      value: "",
      raw: "",
      push: false,
    };
  }
  getCompletion(): string {
    return "";
  }
}
class LiteralArgumentMatcher extends ArgumentMatcher {
  constructor(private readonly literal: string) {
    super();
  }
  matches(value: string): ArgumentResult<null> {
    return value === this.literal || value.startsWith(this.literal + " ")
      ? {
          success: true,
          value: null,
          raw: this.literal,
          push: false,
        }
      : {
          success: false,
          error: `Expected '${this.literal}'`,
        };
  }
  getCompletion(): string {
    return this.literal;
  }
}
class RequiresArgumentMatcher extends ArgumentMatcher {
  constructor(
    public fn: (ctx: CommandContext) => boolean,
    public erorrMessage: string,
    public isConsideredInHelp: boolean = true
  ) {
    super();
  }
  matches(value: string, ctx: CommandContext): ArgumentResult<null> {
    return {
      success: this.fn(ctx),
      value: null,
      raw: "",
      push: false,
      error: this.erorrMessage,
    };
  }
  getCompletion(): string {
    return "";
  }
}
export class StringArgumentMatcher extends ArgumentMatcher {
  constructor(private greedy = false) {
    super();
  }
  matches(value: string): ArgumentResult<string> {
    if (this.greedy) {
      return {
        success: true,
        value,
        raw: value,
        push: true,
      };
    } else {
      let v = value.split(" ")[0];
      if (v[0] === '"') {
        // find the matching quote
        v = "";
        let i = 1;
        while (i < value.length) {
          if (value[i] === '"' && value[i - 1] !== "\\") {
            break;
          }
          v += value[i];
          i++;
        }
        if (i === v.length) {
          // no matching quote
          return {
            success: false,
            error: "Expected matching quote",
          };
        }
      }
      return {
        success: true,
        value: v,
        raw: v,
        push: true,
      };
    }
  }
  getCompletion(): string {
    return `<${this.name}:string>`;
  }
}
export class NumberArgumentMatcher extends ArgumentMatcher {
  constructor() {
    super();
  }
  matches(value: string): ArgumentResult<number> {
    try {
      const match = value.match(/^(-*(?:\d+(?:\.\d+)*|(?:\.\d+)))/);
      if (match) {
        const value2 = parseFloat(match[0]);
        if (Number.isNaN(value2) && Array.isArray(match)) {
          return {
            success: false,
            error: `Expected a number for '${this.name}'`,
          };
        } else {
          return {
            success: true,
            value: value2,
            raw: match[0],
            push: true,
          };
        }
      }
      return {
        success: false,
        error: `Expected a number for '${this.name}'`,
      };
    } catch (e) {
      return {
        success: false,
        error: `Expected a number for '${this.name}'`,
      };
    }
  }
  getCompletion(): string {
    return `<${this.name}:number>`;
  }
}

enum InternalCallType {
  __add,
  __redirect,
  __getDescription,
  __getMatcher,
  __evaluate,
  __isExecutable,
  __getActions,
  __getParent,
  __root,
}
class ArgumentBuilder<
  HandlerFn extends Function = (ctx: CommandContext) => void
> {
  private actions: ArgumentBuilder[];
  private depth = 0;
  private executable?: HandlerFn;
  private parent: ArgumentBuilder;
  private _description: string = null;
  constructor(
    private readonly matcher: ArgumentMatcher = new VoidArgumentMatcher()
  ) {
    this.actions = [];
  }
  public _internalCall<
    T extends InternalCallType,
    X extends (...args: any) => any = T extends InternalCallType.__add
      ? ArgumentBuilder["__add"]
      : T extends InternalCallType.__redirect
      ? ArgumentBuilder["__redirect"]
      : T extends InternalCallType.__getDescription
      ? ArgumentBuilder["__getDescription"]
      : T extends InternalCallType.__getMatcher
      ? ArgumentBuilder["__getMatcher"]
      : T extends InternalCallType.__evaluate
      ? ArgumentBuilder["__evaluate"]
      : T extends InternalCallType.__isExecutable
      ? ArgumentBuilder["__isExecutable"]
      : T extends InternalCallType.__getActions
      ? ArgumentBuilder["__getActions"]
      : T extends InternalCallType.__getParent
      ? ArgumentBuilder["__getParent"]
      : T extends InternalCallType.__root
      ? () => ArgumentBuilder<any>
      : (...args: any[]) => any
  >(Method: T, ...args: Arguments<X>): ReturnType<X> {
    switch (Method) {
      case InternalCallType.__add:
        return this.__add(args[0]) as ReturnType<X>;
      case InternalCallType.__redirect:
        return this.__redirect(args[0]) as ReturnType<X>;
      case InternalCallType.__getDescription:
        return this.__getDescription() as ReturnType<X>;
      case InternalCallType.__getMatcher:
        return this.__getMatcher() as ReturnType<X>;
      case InternalCallType.__evaluate:
        return this.__evaluate(args[0], args[1], args[2]) as ReturnType<X>;
      case InternalCallType.__isExecutable:
        return this.__isExecutable() as ReturnType<X>;
      case InternalCallType.__getActions:
        return this.__getActions() as ReturnType<X>;
      case InternalCallType.__getParent:
        return this.__getParent() as ReturnType<X>;
      case InternalCallType.__root:
        return this.root as ReturnType<X>;
    }
  }
  private __isExecutable(): boolean {
    return this.executable !== undefined;
  }
  private __getDescription(): string {
    return this._description;
  }
  private __getMatcher(): ArgumentMatcher {
    return this.matcher;
  }
  private __getActions(): ArgumentBuilder[] {
    return this.actions;
  }
  private bind<T extends ArgumentBuilder<any>>(ab: T): T {
    this.actions.push(ab);
    ab.setDepth(this.depth + 1, this);
    return ab;
  }
  private setDepth(depth: number, parent: ArgumentBuilder<any> = this): void {
    this.parent = parent;
    this.depth = depth;
    this.actions.forEach((a) => a.setDepth(depth + 1, this));
  }
  private __getParent(): ArgumentBuilder<any> {
    return this.parent;
  }
  private get root(): ArgumentBuilder<any> {
    return this?.parent?.root || this;
  }

  /**
   *
   * @param target
   * @private
   */
  private __add(target: ArgumentBuilder<any>): void {
    this.actions.push(target);
    target.setDepth(this.depth + 1, this);
  }
  /**
   *
   * @param target
   * @private
   */
  private __redirect(target: ArgumentBuilder<any>): void {
    this.actions.push(...target.actions);
  }
  /**
   * @example
   * ```
   * ArgumentBuilderInstance.literal("hello").literal("world")
   * ```
   * @param value the literal value to match against
   * @returns
   */
  literal(value: string): ArgumentBuilder<HandlerFn> {
    return this.bind(
      new ArgumentBuilder<HandlerFn>(
        new LiteralArgumentMatcher(value).setName(value)
      )
    );
  }
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
  number(name: string): ArgumentBuilder<AppendArgument<HandlerFn, number>> {
    return this.bind(
      new ArgumentBuilder<AppendArgument<HandlerFn, number>>(
        new NumberArgumentMatcher().setName(name)
      )
    );
  }

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
  string(
    name: string,
    greedy = false
  ): ArgumentBuilder<AppendArgument<HandlerFn, string>> {
    return this.bind(
      new ArgumentBuilder<AppendArgument<HandlerFn, string>>(
        new StringArgumentMatcher(greedy).setName(name)
      )
    );
  }

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
  position(name: string): ArgumentBuilder<AppendArgument<HandlerFn, Location>> {
    return this.bind(
      new ArgumentBuilder<AppendArgument<HandlerFn, Location>>(
        // the compiler is catching this but not the language server :/
        // @ts-ignore
        new PositionArgumentMatcher().setName(name)
      )
    );
  }
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
  argument<ArgumentType extends ArgumentMatcher>(
    name: string,
    matcher: ArgumentType
  ): ArgumentBuilder<
    AppendArgument<
      HandlerFn,
      GuessTypeBasedOnArgumentResultType<ReturnType<ArgumentType["matches"]>>
    >
  > {
    return this.bind(
      new ArgumentBuilder<
        AppendArgument<
          HandlerFn,
          GuessTypeBasedOnArgumentResultType<
            ReturnType<ArgumentType["matches"]>
          >
        >
      >(matcher.setName(name))
    );
  }
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
  requires(
    fn: (ctx: CommandContext) => boolean,
    error: string,
    isConsideredInHelp = true
  ): ArgumentBuilder<HandlerFn> {
    return this.bind(
      new ArgumentBuilder<HandlerFn>(
        new RequiresArgumentMatcher(fn, error, isConsideredInHelp)
      )
    );
  }
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
  executes(callback: HandlerFn): ArgumentBuilder<HandlerFn> {
    this.bind(new ArgumentBuilder<HandlerFn>()).executable = callback;
    return this;
  }

  /**
   * @example
   * ArgumentBuilderInstance.literal("roll").description("rolls a die")
   * @param description
   * @returns
   *
   */
  description(description: string): this {
    this._description = description;
    return this;
  }
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
  private __evaluate(
    ctx: CommandContext,
    command: string,
    args: any[] = []
  ): CommandResult {
    if (command.length === 0) {
      if (this.executable) {
        try {
          this.executable(ctx, ...args);
        } catch (e: any) {
          return {
            success: true,
            executionSuccess: false,
            executionError: e,
          };
        }
        return { success: true, executionSuccess: true };
      } else {
        return {
          success: false,
          error: "Unexpected end of command",
        };
      }
    }
    let result = this.matcher.matches(command.trim(), ctx);
    if (result.success === true) {
      let results: (CommandResult & { depth?: number })[] = [];
      for (const action of this.actions) {
        const result2 = action.__evaluate(
          ctx,
          command.trim().substring(result.raw.length),
          result.push === false ? [...args] : [...args, result.value]
        );
        if (result2.success) return result2;
        results.push(result2);
      }
      const min = Math.max(...results.map((r) => r?.depth ?? -Infinity));
      return (
        (results.find(
          (r) => (!r.success ? r.depth : -Infinity) === min
        ) as CommandResult) || {
          success: false,
          error: "No results found",
        }
      );
    } else {
      return {
        success: false,
        error: result.error,
        depth: this.depth,
      };
    }
  }
}
export const commandRoot = new ArgumentBuilder(new RootArgumentMatcher());
export function getPossibleCompletions(ctx: CommandContext) {
  let executableNodes: ArgumentBuilder<any>[] = [];
  function findExecutableNodes(node: ArgumentBuilder) {
    const matcher = node._internalCall(InternalCallType.__getMatcher);
    if (matcher instanceof RequiresArgumentMatcher) {
      if (matcher.isConsideredInHelp) {
        const result = matcher.matches("", ctx);
        if (!result.success) {
          // this branch is not accessible to the current context provider
          return;
        }
      }
    }
    if (node._internalCall(InternalCallType.__isExecutable)) {
      executableNodes.push(node);
    }
    for (const action of node._internalCall(InternalCallType.__getActions)) {
      findExecutableNodes(action);
    }
  }
  findExecutableNodes(commandRoot);
  function getCompletionsForNode(node: ArgumentBuilder) {
    const matcher = node._internalCall(InternalCallType.__getMatcher);
    if (matcher instanceof RootArgumentMatcher) {
      // end of the line
      return "";
    }
    const completion = matcher.getCompletion(ctx);
    const parent = node._internalCall(InternalCallType.__getParent);
    if (completion) {
      return (getCompletionsForNode(parent) + " " + completion).trim();
    }
    return getCompletionsForNode(parent);
  }
  function getDescriptionForNode(node: ArgumentBuilder) {
    let desc = node._internalCall(InternalCallType.__getDescription);
    if (desc) {
      return desc;
    }
    if (node === commandRoot) {
      return "No description provided";
    }
    return node
      ._internalCall(InternalCallType.__getParent)
      ._internalCall(InternalCallType.__getDescription);
  }
  let results: string[][] = [];
  for (const node of executableNodes) {
    results.push([getCompletionsForNode(node), getDescriptionForNode(node)]);
  }
  return results;
}
export function registerCommand(
  command: ArgumentBuilder,
  alias: string[] = []
) {
  let cRoot = command._internalCall(InternalCallType.__root);
  alias.forEach((a) => {
    commandRoot.literal(a)._internalCall(InternalCallType.__redirect, cRoot);
  });
  commandRoot._internalCall(InternalCallType.__add, cRoot);
}

export function literal(value: string): ArgumentBuilder {
  return new ArgumentBuilder(new LiteralArgumentMatcher(value));
}

let config = {
  commandIndicator: "-",
  disableDefaultChatHandler: false,
};
export function updateConfig(configUpdate: Partial<typeof config>) {
  Object.assign(config, configUpdate);
}
world.events.beforeChat.subscribe((event) => {
  if (config.disableDefaultChatHandler) return;
  if (event.message.startsWith(config.commandIndicator)) {
    const command = event.message.substring(1);
    const result = commandRoot._internalCall(
      InternalCallType.__evaluate,
      {
        event,
        sender: event.sender,
        dimension: event.sender.dimension,
      },
      command
    );
    event.cancel = true;
    if (result.success === false) {
      event.sender.runCommand(
        `tellraw @s {"rawtext":[{"text":"§4Command Error: ${result.error}"}]}`
      );
      console.warn(result.error);
    }
  }
});
