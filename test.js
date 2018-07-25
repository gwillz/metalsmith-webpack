
const test = require('tape')
const path = require('path')
const fs = require('fs')
const {exec} = require('child_process')
const Metalsmith = require('metalsmith')
const webpack = require('./index')

// TODO test catching webpack errors?

test("Execute example project", assert => {
    create()
    // our plugin, with two entry files
    .use(webpack({
        pattern: 'entry-{1,2}.js',
        config: 'webpack.config.js',
    }))
    // asserts performed in async
    .build((err, files) => {
        if (err) assert.fail(err);
        
        // test exists
        assert.ok(files['entry-1.js'], 'builds [entry-1.js]');
        assert.ok(files['entry-2.js'], 'builds [entry-2.js]');
        
        Promise.all([
            // test entry-1
            run('node ./test/dest/entry-1.js')
            .then(actual => {
                const expected = "other 1\nooooh.\n";
                assert.equal(actual, expected, 'stdout is correct [entry-1.js]');
            }),
            // test entry-2
            run('node ./test/dest/entry-2.js')
            .then(actual => {
                const expected = "other 2\n";
                assert.equal(actual, expected, 'stdout is correct [entry-2.js]');
            })
        ])
        // fail on any error
        .catch(err => {
            assert.fail(err.message);
        })
        // end test after everything is done
        .then(() => assert.end());
    })
})

test("Empty pattern", assert => {
    create()
    .use(webpack({
        pattern: "foo.bar"
    }))
    .build((err, files) => {
        assert.ok(!!err, "error for bad pattern");
        assert.end();
    })
})

test("createEntry()", assert => {
    const mock = {_directory: '/home', _source: 'src'};
    const files = ['abc.js', '123.js'];
    
    const actual = webpack.createEntry(files, mock);
    const expected = {
        'abc': '/home/src/abc.js',
        '123': '/home/src/123.js',
    }
    
    assert.deepEqual(actual, expected);
    assert.end();
})

test("loadConfig()", assert => {
    const actual = webpack.loadConfig('./test/webpack.config.js', {
        sourcemaps: 'inline',
    })
    const expected = {
        mode: 'development',
        sourcemaps: 'inline',
        plugins: [{
            definitions: { config_variable: '\'ooooh.\'' }
        }],
    }
    
    assert.deepEqual(actual, expected);
    assert.end();
})


// promise-ify child_process.exec()
function run(cmd) {
    return new Promise(resolve => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) throw new Error(stderr.toString());
            resolve(stdout.toString());
        })
    })
}


// shorthand
function create() {
    return new Metalsmith(path.resolve(__dirname, 'test/'))
    .clean(true)
    .source('src')
    .destination('dest')
}
