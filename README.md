gulp-iconeer
============

Combines multiple SVG files containing &lt;glyph&gt;´s to one svg file.

Usage
-----

Install:

``` bash
npm install gulp-iconeer
```

Usage example:

``` js
const gulp = require("gulp");
const iconeer = require("gulp-iconeer");

gulp.task("build-icons", function() {
    gulp.src("./icons/*.svg")
        .pipe(iconeer({
            id: "MyAwesomeFont",
            family: "My Awesome Font",
            prefix: "awesome"
        }))
        .pipe(gulp.dest("./bundle"));
});
```

Planned features:
--------
- Conversion of the svg File to a fontpack
- Auto creating CSS file
