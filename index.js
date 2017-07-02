const xml2js = require("xml2js");
const fs = require("fs");
const gulp = require("gulp");
const through = require("through2");
const File = require("vinyl");
const path = require("path");

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

    var opts = options || {
            id: (new Date()).getTime(),
            family: "Your Font"
        };

    function readSVG(file, enc, cb) {
        if (file.isStream() || path.basename(file.path).startsWith("_")) {
            cb();
            return;
        }

        xml2js.parseString(file.contents.toString(), function(err, result) {
            // console.log(JSON.stringify(result));
            var glyphs = getGlyphs(result);

            glyphs.forEach(function(glyph) {
                delete glyph.id;
                font.push(glyph);
            });

            cb();
        });
    }

    function createSVG(cb) {
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

        this.push(outFile);

        cb();
    }

    return through.obj(readSVG, createSVG);
}

module.exports =  packFont;