
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
    
    // our plugin, with two entry files
    .use(webpack({
        pattern: 'entry-{1,2}.js',
        config: 'webpack.config.js',
    }))
    
    // asserts performed in async
    .build((err, files) => {
        if (err) assert.fail(err);
        
        assert.ok(files['entry-1.js'], 'builds [entry-1.js]');
        assert.ok(files['entry-2.js'], 'builds [entry-2.js]');
        
        const wait = [];
        
        // execute output for entry-1
        wait.push(exec('node ./test/dest/entry-1.js', (err, stdout, stderr) => {
            if (err) assert.fail(stderr.toString());
            
            const actual = stdout.toString();
            const expected = "other 1\nooooh.\n";
            
            // verify
            assert.equal(actual, expected, 'stdout is correct [entry-1.js]');
        }))
        
        // execute output for entry-2
        wait.push(exec('node ./test/dest/entry-2.js', (err, stdout, stderr) => {
            if (err) assert.fail(stderr.toString());
            
            const actual = stdout.toString();
            const expected = "other 2\n";
            
            // verify
            assert.equal(actual, expected, 'stdout is correct [entry-2.js]');
        }))
        
        // end test after everything is done
        Promise.all(wait)
        .then(() => assert.end());
    })
})

// TODO test empty pattern

// TODO test catching webpack errors

// TODO test createEntry()

// TODO test loadConfig(), merging settings
