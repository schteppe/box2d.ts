box2d.ts - A TypeScript port of Box2D
=====================================

[![Flattr this git repo](http://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=isaacburns&url=https://github.com/flyover/box2d.ts&title=box2d.ts&language=JavaScript&tags=github&category=software) [![PayPal donate button](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=H9KUEZTZHHTXQ&lc=US&item_name=box2d.ts&currency_code=USD&bn=PP-DonationsBF:btn_donate_SM.gif:NonHosted "Donate to this project using Paypal")

http://rawgit.com/flyover/box2d.ts/master/Box2D/Build/Testbed/index.html

## Usage

### Browser

```html
<script src="box2d.js"></script>
<script>
var gravity = new b2Vec2(0, -10);
</script>
```

### Node.js

```bash
npm install --save box2d.ts
```

```js
var box2d = require('box2d.ts');
var gravity = new box2d.b2Vec2(0, -10);
```

### ES6

```js
import {b2Vec2} from 'box2d.ts';
let gravity = new b2Vec2(0, -10);
```