// src/internal/command.ts
import { world } from "mojang-minecraft";

// src/internal/ArgumentMatcher.ts
var ArgumentMatcher = class {
  matches(_value, _context) {
    return {
      success: false,
      error: "NOT IMPLEMENTED"
    };
  }
  setName(name) {
    this.name = name;
    return this;
  }
  getCompletion(_context) {
    throw new Error("Method not implemented.");
  }
};

// src/internal/arguments/PositionArgument.ts
import { Vector, Location } from "mojang-minecraft";
var regExp = /^([~^]-?\d*(?:\.\d+)?|-?\d+(?:\.\d+)?)/;
function getAxis(value) {
  let type = value.startsWith("^") ? "local" : value.startsWith("~") ? "relative" : "absolute";
  let numericValue = value.substring(type === "absolute" ? 0 : 1);
  return {
    type,
    value: parseFloat(numericValue || "0")
  };
}
function normalizeRotation(rot) {
  while (rot < 0)
    rot += Math.PI * 2;
  while (rot > Math.PI * 2)
    rot -= Math.PI * 2;
  return rot;
}
function cross(a, b) {
  return new Vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}
var NINETY_DEGREES = Math.PI / 2;
function computeLocalOffset(x, y, z, player) {
  const vv = player.viewVector;
  let rotX = Math.atan2(Math.sqrt(vv.x * vv.x + vv.z * vv.z), vv.y) - NINETY_DEGREES;
  let rotY = Math.atan2(vv.z, vv.x);
  rotY = normalizeRotation(rotY - NINETY_DEGREES);
  const up_cos = Math.cos(rotY + NINETY_DEGREES);
  const up_sin = Math.sin(rotY + NINETY_DEGREES);
  const left_cos = Math.cos(-rotX + NINETY_DEGREES);
  const left_sin = Math.sin(-rotX + NINETY_DEGREES);
  const forwords_cos = Math.cos(-rotX);
  const forwords_sin = Math.sin(-rotX);
  const vec3a = new Vector(up_cos * forwords_cos, forwords_sin, up_sin * forwords_cos);
  const vec3b = new Vector(up_cos * left_cos, left_sin, up_sin * left_cos);
  const vec3c = cross(vec3a, vec3b);
  vec3c.x *= -1;
  vec3c.y *= -1;
  vec3c.z *= -1;
  const x_offset = vec3a.x * z + vec3b.x * x + vec3c.x * y;
  const y_offset = vec3a.y * z + vec3b.y * x + vec3c.y * y;
  const z_offset = vec3a.z * z + vec3b.z * x + vec3c.z * y;
  return new Location(player.location.x + x_offset, player.location.y + y_offset, player.location.z + z_offset);
}
var PositionArgumentMatcher = class extends ArgumentMatcher {
  matches(_value, context) {
    let raw = "";
    let matches = [];
    for (let i = 0; i < 3; i++) {
      const [_raw, value] = _value.match(regExp);
      matches.push(value);
      raw += _raw;
      if (!raw)
        return { success: false, error: "Invalid position" };
    }
    let [x, y, z] = matches;
    const _x = getAxis(y);
    const _y = getAxis(x);
    const _z = getAxis(z);
    if (_x.type === "local" && _y.type === "local" && _z.type === "local") {
      return {
        success: true,
        value: computeLocalOffset(_x.value, _y.value, _z.value, context.sender),
        raw
      };
    } else {
      if (_x.type === "local" || _y.type === "local" || _z.type === "local") {
        return {
          success: false,
          error: "Local axis must be used together, they cannot be mixed with local and absolute cordinates."
        };
      }
      return {
        success: true,
        value: new Location(+(_x.type === "relative") * context.sender.location.x + _x.value, +(_y.type === "relative") * context.sender.location.y + _y.value, +(_z.type === "relative") * context.sender.location.z + _z.value),
        raw
      };
    }
  }
  getCompletion(_context) {
    return `<${this.name}:position>`;
  }
};

// src/internal/command.ts
var RootArgumentMatcher = class {
  matches(_value) {
    return {
      success: true,
      value: "",
      raw: "",
      push: false
    };
  }
  setName(name) {
    this.name = name;
    return this;
  }
  getCompletion() {
    return "";
  }
};
var VoidArgumentMatcher = class extends ArgumentMatcher {
  matches(_value) {
    return {
      success: true,
      value: "",
      raw: "",
      push: false
    };
  }
  getCompletion() {
    return "";
  }
};
var LiteralArgumentMatcher = class extends ArgumentMatcher {
  constructor(literal2) {
    super();
    this.literal = literal2;
  }
  matches(value) {
    return value === this.literal || value.startsWith(this.literal + " ") ? {
      success: true,
      value: null,
      raw: this.literal,
      push: false
    } : {
      success: false,
      error: `Expected '${this.literal}'`
    };
  }
  getCompletion() {
    return this.literal;
  }
};
var RequiresArgumentMatcher = class extends ArgumentMatcher {
  constructor(fn, erorrMessage, isConsideredInHelp = true) {
    super();
    this.fn = fn;
    this.erorrMessage = erorrMessage;
    this.isConsideredInHelp = isConsideredInHelp;
  }
  matches(value, ctx) {
    return {
      success: this.fn(ctx),
      value: null,
      raw: "",
      push: false,
      error: this.erorrMessage
    };
  }
  getCompletion() {
    return "";
  }
};
var StringArgumentMatcher = class extends ArgumentMatcher {
  constructor(greedy = false) {
    super();
    this.greedy = greedy;
  }
  matches(value) {
    if (this.greedy) {
      return {
        success: true,
        value,
        raw: value,
        push: true
      };
    } else {
      let v = value.split(" ")[0];
      if (v[0] === '"') {
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
          return {
            success: false,
            error: "Expected matching quote"
          };
        }
      }
      return {
        success: true,
        value: v,
        raw: v,
        push: true
      };
    }
  }
  getCompletion() {
    return `<${this.name}:string>`;
  }
};
var NumberArgumentMatcher = class extends ArgumentMatcher {
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
            error: `Expected a number for '${this.name}'`
          };
        } else {
          return {
            success: true,
            value: value2,
            raw: match[0],
            push: true
          };
        }
      }
      return {
        success: false,
        error: `Expected a number for '${this.name}'`
      };
    } catch (e) {
      return {
        success: false,
        error: `Expected a number for '${this.name}'`
      };
    }
  }
  getCompletion() {
    return `<${this.name}:number>`;
  }
};
var ArgumentBuilder = class {
  constructor(matcher = new VoidArgumentMatcher()) {
    this.matcher = matcher;
    this.depth = 0;
    this._description = null;
    this.actions = [];
  }
  _internalCall(Method, ...args) {
    switch (Method) {
      case 0 /* __add */:
        return this.__add(args[0]);
      case 1 /* __redirect */:
        return this.__redirect(args[0]);
      case 2 /* __getDescription */:
        return this.__getDescription();
      case 3 /* __getMatcher */:
        return this.__getMatcher();
      case 4 /* __evaluate */:
        return this.__evaluate(args[0], args[1], args[2]);
      case 5 /* __isExecutable */:
        return this.__isExecutable();
      case 6 /* __getActions */:
        return this.__getActions();
      case 7 /* __getParent */:
        return this.__getParent();
    }
  }
  __isExecutable() {
    return this.executable !== void 0;
  }
  __getDescription() {
    return this._description;
  }
  __getMatcher() {
    return this.matcher;
  }
  __getActions() {
    return this.actions;
  }
  bind(ab) {
    this.actions.push(ab);
    ab.setDepth(this.depth + 1, this);
    return ab;
  }
  setDepth(depth, parent = this) {
    this.parent = parent;
    this.depth = depth;
    this.actions.forEach((a) => a.setDepth(depth + 1, this));
  }
  __getParent() {
    return this.parent;
  }
  get root() {
    return this?.parent?.root || this;
  }
  __add(target) {
    this.actions.push(target);
    target.setDepth(this.depth + 1, this);
  }
  __redirect(target) {
    this.actions.push(...target.actions);
  }
  literal(value) {
    return this.bind(new ArgumentBuilder(new LiteralArgumentMatcher(value).setName(value)));
  }
  number(name) {
    return this.bind(new ArgumentBuilder(new NumberArgumentMatcher().setName(name)));
  }
  string(name, greedy = false) {
    return this.bind(new ArgumentBuilder(new StringArgumentMatcher(greedy).setName(name)));
  }
  position(name) {
    return this.bind(new ArgumentBuilder(new PositionArgumentMatcher().setName(name)));
  }
  argument(name, matcher) {
    return this.bind(new ArgumentBuilder(matcher.setName(name)));
  }
  requires(fn, error, isConsideredInHelp = true) {
    return this.bind(new ArgumentBuilder(new RequiresArgumentMatcher(fn, error, isConsideredInHelp)));
  }
  executes(callback) {
    this.bind(new ArgumentBuilder()).executable = callback;
    return this;
  }
  description(description) {
    this._description = description;
    return this;
  }
  __evaluate(ctx, command, args = []) {
    if (command.length === 0) {
      if (this.executable) {
        try {
          this.executable(ctx, ...args);
        } catch (e) {
          return {
            success: true,
            executionSuccess: false,
            executionError: e
          };
        }
        return { success: true, executionSuccess: true };
      } else {
        return {
          success: false,
          error: "Unexpected end of command"
        };
      }
    }
    let result = this.matcher.matches(command.trim(), ctx);
    if (result.success === true) {
      let results = [];
      for (const action of this.actions) {
        const result2 = action.__evaluate(ctx, command.trim().substring(result.raw.length), result.push === false ? [...args] : [...args, result.value]);
        if (result2.success)
          return result2;
        results.push(result2);
      }
      const min = Math.max(...results.map((r) => r?.depth ?? -Infinity));
      return results.find((r) => (!r.success ? r.depth : -Infinity) === min) || {
        success: false,
        error: "No results found"
      };
    } else {
      return {
        success: false,
        error: result.error,
        depth: this.depth
      };
    }
  }
};
var commandRoot = new ArgumentBuilder(new RootArgumentMatcher());
function getPossibleCompletions(ctx) {
  let executableNodes = [];
  function findExecutableNodes(node) {
    const matcher = node._internalCall(3 /* __getMatcher */);
    if (matcher instanceof RequiresArgumentMatcher) {
      if (matcher.isConsideredInHelp) {
        const result = matcher.matches("", ctx);
        if (!result.success) {
          return;
        }
      }
    }
    if (node._internalCall(5 /* __isExecutable */)) {
      executableNodes.push(node);
    }
    for (const action of node._internalCall(6 /* __getActions */)) {
      findExecutableNodes(action);
    }
  }
  findExecutableNodes(commandRoot);
  function getCompletionsForNode(node) {
    const matcher = node._internalCall(3 /* __getMatcher */);
    if (matcher instanceof RootArgumentMatcher) {
      return "";
    }
    const completion = matcher.getCompletion(ctx);
    const parent = node._internalCall(7 /* __getParent */);
    if (completion) {
      return (getCompletionsForNode(parent) + " " + completion).trim();
    }
    return getCompletionsForNode(parent);
  }
  function getDescriptionForNode(node) {
    let desc = node._internalCall(2 /* __getDescription */);
    if (desc) {
      return desc;
    }
    if (node === commandRoot) {
      return "No description provided";
    }
    return node._internalCall(7 /* __getParent */)._internalCall(2 /* __getDescription */);
  }
  let results = [];
  for (const node of executableNodes) {
    results.push([getCompletionsForNode(node), getDescriptionForNode(node)]);
  }
}
function registerCommand(command, alias = []) {
  alias.forEach((a) => {
    commandRoot.literal(a)._internalCall(1 /* __redirect */, command);
  });
  commandRoot._internalCall(0 /* __add */, command);
}
function literal(value) {
  return new ArgumentBuilder(new LiteralArgumentMatcher(value));
}
var config = {
  commandIndicator: "-",
  disableDefaultChatHandler: false
};
function updateConfig(configUpdate) {
  Object.assign(config, configUpdate);
}
world.events.beforeChat.subscribe((event) => {
  if (config.disableDefaultChatHandler)
    return;
  if (event.message.startsWith(config.commandIndicator)) {
    const command = event.message.substring(1);
    const result = commandRoot._internalCall(4 /* __evaluate */, {
      event,
      sender: event.sender,
      dimension: event.sender.dimension
    }, command);
    event.cancel = true;
    if (result.success === false) {
      event.sender.runCommand(`tellraw @s {"rawtext":[{"text":"\xA74Command Error: ${result.error}"}]}`);
      console.warn(result.error);
    }
  }
});
export {
  NumberArgumentMatcher,
  StringArgumentMatcher,
  commandRoot,
  getPossibleCompletions,
  literal,
  registerCommand,
  updateConfig
};
/*!
Copyright 2022 Ian Senne

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


original source: https://github.com/IanSSenne/gtf/blob/master/src/lib/command.ts
author: Ian Senne
*/
