
const test = require('tape')
const path = require('path')
const fs = require('fs')
const {exec} = require('child_process')
const Metalsmith = require('metalsmith')
const webpack = require('./index')

test("Execute example project", assert => {
    new Metalsmith(path.resolve(__dirname, 'test/'))
    .clean(true)
    .source('src')
    .destination('dest')
    
    .use(webpack({
        pattern: 'entry-{1,2}.js',
        config: 'webpack.config.js',
    }))
    
    .build((err, files) => {
        if (err) assert.fail(err);
        
        assert.ok(files['entry-1.js']);
        assert.ok(files['entry-2.js']);
        
        exec('node ./test/dest/entry-1.js', (err, stdout, stderr) => {
            if (err) {
                assert.fail(stderr.toString());
            }
            const actual = stdout.toString();
            const expected = "other 1\ndevelopment\n";
            
            assert.equal(actual, expected);
        })
        
        exec('node ./test/dest/entry-2.js', (err, stdout, stderr) => {
            if (err) {
                assert.fail(stderr.toString());
            }
            const actual = stdout.toString();
            const expected = "other 2\n";
            
            assert.equal(actual, expected);
        })
    })
    
    assert.end();
})
