const path = require('path');
const startServer = require('./lib/server.js');
const slash = path.join('/');
let node_modules = path.join(__dirname).split(slash);
node_modules.pop(); // Pops current dir_name
node_modules = node_modules.join(slash);
const i4w = require(path.join(node_modules,'/import-for-web/index.js')); // Require the 'import-for-web'
//Pass the compiler to I4W before parsing or bundling
i4w.transform(require('./lib/compiler.js').translate);
const base = i4w.baseDirectory;

i4w.bundle();


var watchersFD = {};
function watcher(dir,onchange,watch,isFile){
    if(!watch){
        try {
            watchersFD[dir].close();
        } catch (error) {
            
        }
        if(isFile){
            return
        }
    }
    var contents,pathname,mainPath,err=false;
    try {
        contents = fs.readdirSync(dir,"utf8");
    } catch (error) {
        err = true;
    }
    if(!err){
        if(watch){
            for(var i = 0;i<contents.length;i++){
                pathname = contents[i].split(".").pop();
                var is_dir = !(["js","jsx","cjs","mjs"].includes(pathname));
                if(is_dir){
                    watcher(path.join(dir,"/"+contents[i]),9,true);
                }else{
                    watchFile(path.join(dir,"/"+contents[i]));
                }
            }

            let emitted = false;
            watchersFD[dir] = fs.watch(dir,function(event,filename){
                    if(!emitted){
                        emitted = true;
                        var is_dir = !(["js","jsx","cjs","mjs"].includes(filename.split(".").pop()));
                        try {
                            if(is_dir){
                                fs.readdirSync(path.join(dir,filename));
                            }
                        } catch (error) {
                            // if(error.code=='ENOENT'&&error.path.startsWith(path.join(srcDir,"/scripts/"))){
                            //     var f = error.path.replace(path.join(srcDir,"/scripts"),"");
                            //     remove(path.join(srcDir,"/module",f));
                            //     remove(path.join(srcDir,"/ssr/module",f));
                            //     remove(path.join(srcDir,"/ssr/inline_modules",f));
                            // }
                            console.log(error);
                        }
                        watcher(dir,9,false,false);
                        setTimeout(() => {
                            watcher(dir,9,true);
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
                var is_dir = !(["js","jsx","cjs","mjs"].includes(pathname));
                mainPath = path.join(dir,"/"+contents[i]);
                if(is_dir){
                    if(watchersFD[mainPath]){
                        watcher(mainPath,9,false);
                    }
                }else{
                    if(watchersFD[mainPath]){
                        watcher(mainPath,9,false,true);
                    }
                }
            }
        }
    }else{
        
    }
}

function watchFile(filename,wait){
    let emmited = false;
    if(watchersFD[filename]){
        try {
            watchersFD[filename].close()
        } catch (error) {
            
        }
    }
    watchersFD[filename] = fs.watch(filename,function(event,f_name){
        if(!emmited){
            emmited = true;
            watcher(filename,9,false,true);
            setTimeout(() => {
                
                i4w.bundle();
                //buildScripts(filename);
                // if(!ups_cleared){
                //     updates = {};
                //     ups_cleared = true;
                // }
                // updates[(filename.replace(path.join(srcDir,"/scripts/"),"/module/")).replace(/\\/g,"/").replace(/\/\//g,"/")]
                // = true;
                watchFile(filename);
                emmited = false;

            }, 100);
        }
    });
}

watcher(path.join(base, "/scr/modules"), 9, true);

startServer(base);