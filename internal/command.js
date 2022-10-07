import { BlockLocation, world, } from "mojang-minecraft";
import { ArgumentMatcher, } from "./ArgumentMatcher";
import { PositionArgumentMatcher } from "./arguments/PositionArgument";
class RootArgumentMatcher {
    matches(_value) {
        return {
            success: true,
            value: "",
            raw: "",
            push: false,
        };
    }
    setName(name) {
        this.name = name;
        return this;
    }
}
class LiteralArgumentMatcher extends ArgumentMatcher {
    constructor(literal) {
        super();
        this.literal = literal;
    }
    matches(value) {
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
}
class RequiresArgumentMatcher extends ArgumentMatcher {
    constructor(fn, erorrMessage) {
        super();
        this.fn = fn;
        this.erorrMessage = erorrMessage;
    }
    matches(value, ctx) {
        return {
            success: this.fn(ctx),
            value: null,
            raw: "",
            push: false,
            error: this.erorrMessage,
        };
    }
}
export class StringArgumentMatcher extends ArgumentMatcher {
    constructor() {
        super();
    }
    matches(value) {
        return {
            success: true,
            value,
            raw: value,
            push: true,
        };
    }
}
export class NumberArgumentMatcher extends ArgumentMatcher {
    constructor() {
        super();
    }
    matches(value) {
        try {
            const match = value.match(/^(-*(?:\d+(?:\.\d+)*|(?:\.\d+)))/);
            if (match) {
                const value2 = parseFloat(match[0]);
                if (Number.isNaN(value2) && Array.isArray(match)) {
                    return {
                        success: false,
                        error: `Expected a number for '${this.name}'`,
                    };
                }
                else {
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
        }
        catch (e) {
            return {
                success: false,
                error: `Expected a number for '${this.name}'`,
            };
        }
    }
}
class SelectorArgumentMatcher extends ArgumentMatcher {
    constructor() {
        super();
    }
}
class ArgumentBuilder {
    constructor(matcher = new RootArgumentMatcher()) {
        this.matcher = matcher;
        this.depth = 0;
        this.actions = [];
    }
    bind(ab) {
        this.actions.push(ab);
        ab.setDepth(this.depth + 1, this);
        return ab;
    }
    setDepth(depth, parent = this) {
        this.parent = parent;
        this.depth = depth;
        this.actions.forEach((a) => a.setDepth(depth + 1));
    }
    get root() {
        return this?.parent?.root || this;
    }
    /**
     *
     * @param target
     * @private
     */
    __add(target) {
        this.actions.push(target);
        target.setDepth(this.depth + 1);
    }
    /**
     *
     * @param target
     * @private
     */
    __redirect(target) {
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
    literal(value) {
        return this.bind(new ArgumentBuilder(new LiteralArgumentMatcher(value).setName(value)));
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
    number(name) {
        return this.bind(new ArgumentBuilder(new NumberArgumentMatcher().setName(name)));
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
    string(name) {
        return this.bind(new ArgumentBuilder(new StringArgumentMatcher().setName(name)));
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
    position(name) {
        return this.bind(new ArgumentBuilder(
        // the compiler is catching this but not the language server :/
        // @ts-ignore
        new PositionArgumentMatcher().setName(name)));
    }
    /**
     * @example
     * ```
     * ArgumentBuilderInstance.literal("roll").selector("pattern")
     * ```
     * this would match `roll 1d20` and provide `1d20` as the pattern
     *
     * @param name
     * @returns
     */
    selector(name) {
        return this.bind(new ArgumentBuilder(new SelectorArgumentMatcher().setName(name)));
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
    argument(name, matcher) {
        return this.bind(new ArgumentBuilder(matcher.setName(name)));
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
    requires(fn, error) {
        return this.bind(new ArgumentBuilder(new RequiresArgumentMatcher(fn, error)));
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
    executes(callback) {
        this.bind(new ArgumentBuilder()).executable = callback;
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
    evaluate(ctx, command, args = []) {
        if (command.length === 0) {
            if (this.executable) {
                try {
                    this.executable(ctx, ...args);
                }
                catch (e) {
                    return {
                        success: true,
                        executionSuccess: false,
                        executionError: e,
                    };
                }
                return { success: true, executionSuccess: true };
            }
            else {
                return {
                    success: false,
                    error: "Unexpected end of command",
                };
            }
        }
        let result = this.matcher.matches(command.trim(), ctx);
        if (result.success === true) {
            let results = [];
            for (const action of this.actions) {
                const result2 = action.evaluate(ctx, command.trim().substring(result.raw.length), result.push === false ? [...args] : [...args, result.value]);
                if (result2.success)
                    return result2;
                results.push(result2);
            }
            const min = Math.max(...results.map((r) => r?.depth ?? -Infinity));
            return (results.find((r) => (!r.success ? r.depth : -Infinity) === min) || {
                success: false,
                error: "No results found",
            });
        }
        else {
            return {
                success: false,
                error: result.error,
                depth: this.depth,
            };
        }
    }
}
export const commandRoot = new ArgumentBuilder();
export const helpMessages = new Map();
export function registerCommand(command, help, alias = []) {
    alias.forEach((a) => {
        helpMessages.set(a, help);
        commandRoot.literal(a).__redirect(command);
    });
    commandRoot.__add(command);
    helpMessages.set(command.matcher.name, help);
}
export function literal(value) {
    return new ArgumentBuilder(new LiteralArgumentMatcher(value));
}
const OVERWORLD = world.getDimension("overworld");
const THE_NETHER = world.getDimension("nether");
const THE_END = world.getDimension("the end");
function getDimension(player) {
    const bl = new BlockLocation(Math.floor(player.location.x), Math.floor(player.location.y), Math.floor(player.location.z));
    if (OVERWORLD.getEntitiesAtBlockLocation(bl).includes(player))
        return OVERWORLD;
    if (THE_NETHER.getEntitiesAtBlockLocation(bl).includes(player))
        return THE_NETHER;
    if (THE_END.getEntitiesAtBlockLocation(bl).includes(player))
        return THE_END;
    throw new Error("Unable to locate player dimension");
}
world.events.beforeChat.subscribe((event) => {
    if (event.message.startsWith("-")) {
        const command = event.message.substring(1);
        const result = commandRoot.evaluate({
            event,
            sender: event.sender,
            dimension: getDimension(event.sender),
        }, command);
        event.cancel = true;
        if (result.success === false) {
            event.sender.runCommand(`tellraw @s {"rawtext":[{"text":"§4Command Error: ${result.error}"}]}`);
            console.warn(result.error);
        }
    }
});
