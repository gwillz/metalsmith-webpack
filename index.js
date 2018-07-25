
const path = require('path')
const match = require('multimatch')
const fs = new (require('memory-fs'))()
// load as a peerDependency
const realwebpack = (function() {
    const target = require.resolve('webpack', module.parent);
    return require(target);
})()

module.exports = function main(options) {
    options = Object.assign({
        pattern: '**/*.js', // Only process these files
        config: null,       // load a PostCSS config from elsewhere
        // and any valid webpack options
        // note: 'entry' 'output' will be ignored.
    }, options)
    
    // plugin export
    return async function webpack(files, metalsmith, done) {
        try {
            const {pattern, config, ...other} = options;
            
            // filter for processing files
            const validFiles = match(Object.keys(files), pattern);
            
            if (validFiles.length === 0) {
                throw new Error(`Pattern '${pattern}' did not match any files.`);
            }
            
            // load the webpack config if specified
            const settings = (config)
                ? loadConfig(path.resolve(metalsmith._directory, config))
                : other;
            
            // Some basic entry files based on 'pattern'
            // Bogus output path for memory-fs
            const engine = realwebpack({
                ...settings,
                entry: createEntry(validFiles, metalsmith),
                output: {path: '/', filename: '[name].js'},
            })
            // tack on the fake file system
            engine.outputFileSystem = fs;
            
            // go.
            engine.run((err, stats) => {
                // These errors get piped through metalsmith, in the catch().
                if (err) throw new Error(err);
                if (stats.hasErrors()) {
                    const {errors} = stats.toJson();
                    throw new Error(errors);
                }
                
                // This is pretty naive, and asummes webpack won't
                // bastardise the output file name. But here we are.
                for (let file of validFiles) {
                    let dest = path.resolve('/', path.basename(file));
                    files[file].contents = fs.readFileSync(dest, 'utf-8');
                }
                done();
            })
        }
        catch (err) {
            done(err);
        }
    }
}

/**
 * Create an entry set for webpack
 * - ids is like: 'abc'
 * - path is like: '/.../src/js/abc.js'
 */
function createEntry(files, metalsmith) {
    const entry = {};
    for (let file of files) {
        let {dir, name, base} = path.parse(file);
        entry[name] = path.resolve(
            metalsmith._directory, metalsmith._source, dir, base
        );
    }
    return entry;
}

/**
 * Load a config file. Local (options) settings will
 * override those loaded from the config file.
 * This does a lookup that respects peerDependencies.
 */
function loadConfig(config, settings) {
    const target = require.resolve(config, module.parent);
    return {...require(target), ...settings};
}

// export utility functions for testing
module.exports.createEntry = createEntry;
module.exports.loadConfig = loadConfig;
