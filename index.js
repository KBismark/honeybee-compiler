const fs = require('fs');
const path = require('path');
const compiler = require('./lib/compiler.js');
const startServer = require('./lib/server.js');
const slash = path.join('/');
// All pathnames ending with these file extensions are assumed to be files and not directories
const fileExtensions = ["js", "jsx", "cjs", "mjs", "ts", "tsx"];
// We want to get the path to the node_modules directory of the main project
let node_modules = path.join(__dirname).split(slash);
node_modules.pop(); // Pops current dir_name
node_modules = node_modules.join(slash);
// Require the 'import-for-web'
// 'import-for-web' only works if it is part of the dependecies of the project
// We do not want our own 'import-for-web' as a dependency for this package
// hence we use the main project's 'import-for-web' in the /node_modules
const i4w = require(path.join(node_modules,'/import-for-web/index.js')); 

// store the path to the project's directory
const base = i4w.baseDirectory;

// Project package.json
const packageJSON = require(`${base}/package.json`);

// Support for plugins
let plugins,plug = (code) => code;
try {
    plugins = require(path.join(base, '/i4w.plugin.js'));
    plugins.before = plugins.before?plugins.before:plug;;
    plugins.mid = plugins.mid?plugins.mid:plug;
    plugins.after = plugins.after?plugins.after:plug;
} catch (error) { 
    plugins = {
        before: plug,
        mid: plug,
        after: plug
    }
}

//Pass the compiler to I4W before parsing or bundling
i4w.transform({
    before: plugins.before,
    mid: (code) => { 
        code = compiler.translate(code);
        return plugins.mid(code);
    },
    after: plugins.after
});
// First parse and bundle
i4w.bundle();
// Maps watching files' pathnames to their descriptors
var watchersFD = {};
// Watch directory and create dist/modules directories when new directories are created in src/modules 
function watcher(dir,watch,isFile){
    if(!watch){
        try {
            // Close watcher if file is already being watched
            watchersFD[dir].close();
        } catch (error) {
            // Closing unwatched file would cause error.
            // Catch error
        }
        if(isFile){
            return
        }
    }
    var contents,pathname,mainPath,err=false;
    try {
        // Per our knowledge, `dir` is supposed to be a directory path
        // if we can not read it contents, then it is a system error
        contents = fs.readdirSync(dir,"utf8");
    } catch (error) {
        err = true;
    }
    if(!err){
        if(watch){
            for(var i = 0;i<contents.length;i++){
                pathname = contents[i].split(".").pop();

                var is_dir = !(fileExtensions.includes(pathname));
                if(is_dir){
                    watcher(path.join(dir,"/"+contents[i]),true);
                }else{
                    watchFile(path.join(dir,"/"+contents[i]));
                }
            }

            let emitted = false;
            watchersFD[dir] = fs.watch(dir,function(event,filename){
                    if(!emitted){
                        emitted = true;
                        var is_dir = !(fileExtensions.includes(filename.split(".").pop()));
                        try {
                            if(is_dir){
                                fs.readdirSync(path.join(dir,filename));
                            }
                        } catch (error) {
                            // Encounted error testing if it was a directory 
                            //TODO: 
                            // - Handle situation
                            
                        }
                        watcher(dir,false,false);
                        setTimeout(() => {
                            watcher(dir,true);
                            emitted = false;
                        }, 100);
                    }
                
            }).on("error",function(error){
                if(error.code=='EPERM'&&error.syscall=='watch'&&error.filename===null){

                }
            });

        }else{
            for(var i = 0;i<contents.length;i++){
                pathname = contents[i].split(".").pop();
                var is_dir = !(fileExtensions.includes(pathname));
                mainPath = path.join(dir,"/"+contents[i]);
                if(is_dir){
                    if(watchersFD[mainPath]){
                        watcher(mainPath,false);
                    }
                }else{
                    if(watchersFD[mainPath]){
                        watcher(mainPath,false,true);
                    }
                }
            }
        }
    } else {
        // system error
    }
}

function watchFile(filename,wait){
    let emmited = false;
    if(watchersFD[filename]){
        try {
            // Close watcher if file is already being watched
            watchersFD[filename].close()
        } catch (error) {
            // Closing unwatched file would cause error.
            // Catch error
        }
    }
    watchersFD[filename] = fs.watch(filename,function(event,f_name){
        if(!emmited){
            emmited = true;
            watcher(filename,false,true);
            setTimeout(() => {
                i4w.bundle();
                watchFile(filename);
                emmited = false;

            }, 100);
        }
    });
}

watcher(path.join(base, "/src/modules"), true,false);

let exportor = () => { };

if (!packageJSON.extended) {
    startServer(base);
} else {
    // Extended mode
    exportor = () => {
        startServer(base, true);
    }
}

module.exports = exportor;