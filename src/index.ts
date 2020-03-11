
import path from 'path';
import match from 'multimatch';
import memfs from 'memory-fs';
import type { Plugin, Files } from 'metalsmith';
import type { Compiler, Configuration } from 'webpack';

type webpack = (options: Configuration) => Compiler;

const fs = new memfs();

// load webpack as a peerDependency
const realwebpack = (function() {
    const target = require.resolve('webpack', module.parent!);
    return require(target);
})() as webpack;

interface Options extends Partial<Configuration> {
    pattern: string; // Only process these files
    config?: string; // // load a Webpack config from elsewhere
    
}

module.exports = function main(opts: Partial<Options>): Plugin {
    const options: Options = {
        pattern: '**/*.js',
        // and any valid webpack options
        // note: 'entry' 'output' will be ignored.
        ...opts,
    };
    
    // Singleton compiler
    const getCompiler = (function() {
        
        let cache: Compiler | undefined = undefined;
        
        // @ts-ignore : there's some extra stuff in the webpack namespace and
        // I haven't bothered to get the typings right.
        let defaulter = new realwebpack.WebpackOptionsDefaulter();
        
        return function getCompiler(options: Configuration) {
            if (cache) {
                cache.options = defaulter.process(options);
            }
            else {
                cache = realwebpack(options);
                cache.outputFileSystem = fs;
            }
            return cache;
        }
    })();
    
    // plugin export
    return function webpack(files, metalsmith, done) {
        try {
            const {pattern, config, ...other} = options;
            
            // filter for processing files
            const validFiles = match(Object.keys(files), pattern);
            
            if (validFiles.length === 0) {
                throw new Error(`Pattern '${pattern}' did not match any files.`);
            }
            
            // load the webpack config if specified
            const settings = (config)
                ? loadConfig(path.resolve(metalsmith.directory(), config), other)
                : other;
            
            // Some basic entry files based on 'pattern'
            // Bogus output path for memory-fs
            const compiler = getCompiler({
                ...settings,
                entry: createEntry(validFiles, metalsmith.source()),
                output: {path: '/', filename: '[name].js'},
            });
            
            // go.
            compiler.run(async (err, stats) => {
                try {
                    if (err) throw err;
                    
                    if (stats.hasErrors()) {
                        const { errors } = stats.toJson();
                        throw new Error(errors.join(", "));
                    }
                    
                    // This assumes '[name].js' is consistent.
                    for (let file of validFiles) {
                        let {name, dir} = path.parse(file);
                        let dest = path.join(dir, name + ".js");
                        let mempath = '/' + name + ".js";
                        
                        files[dest] = files[file];
                        files[dest].contents = await readMemFile(mempath);
                        
                        // If we're not replacing the original file name.
                        if (file !== dest) delete files[file];
                    }
                    done(null, files, metalsmith);
                }
                catch (err) {
                    done(err, files, metalsmith);
                }
            })
        }
        catch (err) {
            done(err, files, metalsmith);
        }
    }
}

/**
 * Create an entry set for webpack
 * - ids is like: 'abc'
 * - path is like: '/.../src/js/abc.js'
 */
function createEntry(files: string[], rootdir: string): Record<string, string> {
    const entry = {} as Record<string, string>;
    
    for (let file of files) {
        let {dir, name, base} = path.parse(file);
        entry[name] = path.resolve(rootdir, dir, base);
    }
    return entry;
}

async function readMemFile(mempath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(mempath, 'utf-8', (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
}

/**
 * Load a config file. Local (options) settings will
 * override those loaded from the config file.
 * This does a lookup that respects peerDependencies.
 */
function loadConfig(config: string, settings: Configuration): Configuration {
    const target = require.resolve(config, module.parent!);
    return {...require(target), ...settings};
}

// export utility functions for testing
module.exports.createEntry = createEntry;
module.exports.loadConfig = loadConfig;
