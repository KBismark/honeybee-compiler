const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const colors = require('./colors.js');
let i4w_map = {};
let baseDirectory = "";
const PORT = process.env.PORT || 9001;

const server = http.createServer(function (req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    if (pathname == '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
            .write(fs.readFileSync(path.join(baseDirectory, '/index.html')));
        res.end();
    }

    if (pathname == '/dist/modules/index.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript' })
            .write(fs.readFileSync(path.join(baseDirectory, '/dist/modules/index.js.bundle.js')));
        res.end();
    }

    else if (pathname.startsWith('/modules/')) {
        if (!i4w_map[pathname]) {
            res.end('');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/javascript' })
            .write(fs.readFileSync(i4w_map[pathname]+'.bundle.js'));
        res.end();
    }
        
    else if (pathname.startsWith('/assets/')) {
        serveAssets(pathname, res);
    }    
    else {
        res.end();
    }
})

function serveAssets(pathname,res){
    let splited_url = pathname.split("/"),fileContent = null;
    
    try {
        fileContent = fs.readFileSync(path.join(baseDirectory,pathname));
    } catch (error) {
        fileContent=null;
    }
    if(fileContent!==null){
        switch (pathname.split("/")[2]) {
            case "style":
                res.writeHead(200,{
                    "Content-Type":"text/css"
                }).write(fileContent);
                break;
            case "js":
                res.writeHead(200,{
                    "Content-Type":"text/javascript"
                }).write(fileContent);
                break;
            case "image":
                var imageType = splited_url[3].split(".").pop().toLowerCase();
                if(imageType!=="svg"){
                    res.writeHead(200,{
                        "Content-Type":`image/${imageType}`
                    }).write(fileContent);
                }else{
                    res.writeHead(200,{
                        "Content-Type":`image/svg+xml`
                    }).write(fileContent);
                }
                break;
            case "font":
                var fontType = splited_url[3].split(".").pop().toLowerCase();
                switch (fontType) {
                    case "woff":
                    case "woff2":
                        fontType="woff";
                    case "ttf":
                        res.writeHead(200,{
                            "Content-Type":"application/x-font-"+fontType
                        }).write(fileContent);
                        break;
                    case "svg":
                        res.writeHead(200,{
                            "Content-Type":"image/svg+xml"
                        }).write(fileContent);
                        break;
                    case "eot":
                        res.writeHead(200,{
                            "Content-Type":"application/vnd.ms-fontobject"
                        }).write(fileContent);
                        break;

                    //Add your own font extention cases here

                    default:
                        res.writeHead(404,{});
                        break;
                }
                break;

            //Add your own path cases here

            default:
                res.writeHead(404,{});
        }
        res.end();
    }else{
        res.writeHead(404,{});
        res.end();
    }
}

module.exports = function (base) {
    baseDirectory = base;
    i4w_map = require(path.join(baseDirectory,'/i4w.map.js'))()
    server.listen(PORT, () => {
        console.log(`${colors.text('>>').yellowColor().bold().get()} ${colors.text(`App started on port ${PORT}`).bold().blueColor().get()}`);
        console.log(colors.text(`Open at ${colors.text(`http://localhost:${PORT}`).greyColor().get()}`).bold().whiteColor().get());
    })
}