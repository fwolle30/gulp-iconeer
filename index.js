const xml2js = require("xml2js");
const fs = require("fs");
const gulp = require("gulp");
const through = require("through2");
const File = require("vinyl");
const path = require("path");
const moustache = require("moustache");
const svg2ttf = require("svg2ttf");
const ttf2woff = require("ttf2woff");
const ttf2woff2 = require("ttf2woff2");

var cssTemplate = "@font-face { \n\
    font-family: '{{font-family}}'; \n\
\n\
    src: url('../fonts/{{font-id}}.woff2') format('woff2'); \n\
         url('../fonts/{{font-id}}.woff') format('woff'), \n\
         url('../fonts/{{font-id}}.ttf') format('truetype'); \n\
\n\
    font-weight: normal; \n\
    font-style: normal; \n\
} \n\
\n\
.{{css-prefix}} { \n\
    display: inline-block; \n\
    font: normal normal normal 14px/1 '{{font-family}}'; \n\
    font-size: inherit; \n\
    text-rendering: auto; \n\
    -webkit-font-smoothing: antialiased; \n\
    -moz-osx-font-smoothing: grayscale; \n\
}\n\
\n\
{{#glyphs}}{{>glyph}}{{/glyphs}}";

var cssGlyphTemplate = ".{{css-prefix}}-{{name}}:before { \n\
    content: '\\{{charcode}}';\n\
}\n\
\n";

function getGlyphs(obj) {
    var out = [];
    if (obj instanceof Object) {
        var keys = Object.keys(obj);

        keys.forEach(function(key) {
            if (key === "glyph") {
                out.push(obj[key][0]['$']);
            } else {
                var glyphs = getGlyphs(obj[key]);

                glyphs.forEach(function(glyph) {
                    out.push(glyph);
                });
            }
        });
    }

    return out;
}

function packFont(options) {
    var font = [];

    var defaults = {
        id: (new Date()).getTime(),
        family: "Your Font",
        prefix: "font",
        copyright: "your-name",
        timestamp: (new Date()).getTime() / 1000,
        version: "1.0"
    };

    var opts = {};

    if (options instanceof Object) {
        Object.keys(defaults)
            .forEach(function(key) {
                opts[key] = defaults[key];
            });

        Object.keys(options)
            .forEach(function(key) {
                opts[key] = options[key];
            });
    } else {
        opts = defaults
    }

    var index = 0;
    function readSVG(file, enc, cb) {
        if (file.isStream() || path.basename(file.path).startsWith("_")) {
            cb();
            return;
        }

        xml2js.parseString(file.contents.toString(), function(err, result) {
            // console.log(JSON.stringify(result));
            var glyphs = getGlyphs(result);

            glyphs.forEach(function(glyph) {
                glyph.id = "fnt" + (index++);
                font.push(glyph);
            });

            cb();
        });
    }

    function createSVG(ctx) {
        var fontPrepared = [];
        font.forEach(function(glyph) {
            fontPrepared.push({
                $: glyph
            });
        });

        var xml = {
            svg: {
                $: {
                    version: "1.0",
                    width: "1066.6666",
                    height: "1066.6666"
                },
                defs: {
                    font: {
                        $: {
                            "horiz-adv-x": "1024",
                            "id": opts.id,
                            "horiz-origin-x": "0",
                            "horiz-origin-y": "0",
                            "vert-origin-x": "45",
                            "vert-origin-y": "90",
                            "vert-adv-y": "90"
                        },
                        "font-face": {
                            $: {
                                "units-per-em": "1024",
                                "font-family": opts.family
                            }
                        },
                        "missing-glyph": {
                            $: {
                                d: "M0,0h1000v1024h-1000z"
                            }
                        },
                        "glyph": fontPrepared
                    }
                }
            }
        };

        var builder = new xml2js.Builder();
        var outXML = builder.buildObject(xml);

        var outFile = new File({
            path: './fonts/' + opts.id + '.svg',
            contents: Buffer.from(outXML)
        });

        ctx.push(outFile);

        return outXML;
    }

    function createCSS(ctx) {
        var model = {
            "font-family": opts.family,
            "font-id": opts.id,
            "css-prefix": opts.prefix
        };

        var glyphs = [];

        font.forEach(function(glyph) {
            var charCode = glyph.unicode.charCodeAt().toString(16);
            var glyphName = glyph["glyph-name"];

            glyphs.push({
                name: glyphName,
                charcode: charCode
            });
        });

        model.glyphs = glyphs;

        var css = moustache.render(cssTemplate, model, {
            "glyph": cssGlyphTemplate
        });

        var outFile = new File({
            path: './css/' + opts.id + '.css',
            contents: Buffer.from(css)
        });

        ctx.push(outFile);
    }

    function createTTF(svg, ctx) {
        var ttf = svg2ttf(svg, {
            copyright: opts.copyright,
            ts: opts.timestamp,
            version: opts.version
        });

        var outFile = new File({
            path: './fonts/' + opts.id + '.ttf',
            contents: new Buffer.from(ttf.buffer)
        });

        ctx.push(outFile);

        return ttf;
    }

    function createWOFF(ttf, ctx) {
        var woff = ttf2woff(new Uint8Array(ttf.buffer));

        var outFile = new File({
            path: './fonts/' + opts.id + '.woff',
            contents: new Buffer.from(woff.buffer)
        });

        ctx.push(outFile);

        return woff;
    }

    function createWOFF2(ttf, ctx) {
        var woff2 = ttf2woff2(ttf.buffer);

        var outFile = new File({
            path: './fonts/' + opts.id + '.woff2',
            contents: woff2
        });

        ctx.push(outFile);

        return woff2;
    }

    function createPack(cb) {
        var svg = createSVG(this);
        var ttf = createTTF(svg, this);

        createWOFF(ttf, this);
        createWOFF2(ttf, this);
        createCSS(this);

        cb();
    }

    return through.obj(readSVG, createPack);
}

module.exports =  packFont;