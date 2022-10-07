# gtf-command

`gtf-command` is a standalone version of the command parser I wrote for my `gtf` repo,

I have decided to release it as a standalone library so that it will hopefully see some use.

this project is licennsed using the MIT license, credit is appreciated.

## examples:

### registering a basic command

```js
import {registerCommand,literal} from

registerCommand(literal("say").executes((ctx)=>{
	ctx.sender.tell({text:`hi ${ctx.sender.name} from javascript`})
}),"says hi")
```
