
# Metalsmith Webpack

A Webpack plugin for Metalsmith.

This is a bit different to existing metalsmith-webpack plugins:

- a plugin should not write any files itself
- a plugin should accept the files given to it
- a plugin should not have 'webpack' as a direct dependency

*As a result, this plugin may not suit everyone's use-cases.*


## Important things

This plugin will ignore both `entry` and `output` fields of a webpack config file.


### The `entry` set

This plugin will dynamically create an `entry` set based on files filtered by
the given glob `pattern` parameter. 

Note; it'll only create entries for files that exist. If the pattern doesn't
match any files, it will throw an error.

For example:

```js
pattern: "js/{index,utils}.js"
// would become
entry: {
    index: '/.../js/index.js',
    utils: '/.../js/utils.js',
}
```

Perhaps we could just loop through the entry set and test each against the
internal files map. But patterns are simpler and *my* use-case doesn't
require it. When this someone needs it, it will be written.

(although only after the 'output chunks' feature is written, currently the
output files rely on the `pattern` field too.)


### The `output` field

The `output` field is irrelevant, considering files are written by Metalsmith
and not Webpack. Instead, this plugin will only write files that match the
`pattern` field.

This means any the output files are also reliant on the 'pattern' field.
Additional output files, like `.map`, `manifest.json`, `.html` or vendor and 
async files will be lost. 

In future, this can resolved by instead using the `stats.chunks` output
from Webpack instead.


## Usage

```js
const webpack = require('metalsmith-webpack')

new Metalsmith(__dirname)
.use(webpack({
    pattern: '**/*.{sss,css}',
    config: './webpack.config.js',
    // 'config' AND/OR inline (these will override config file settings)
    devtool: 'inline',
    module: {
        rules: [
            etc...
        ]
    }
}))
.build(err => {
    if (err) throw err;
})
```
