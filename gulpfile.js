"use strict";

var gulp = require("gulp");
var babel = require("gulp-babel"),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename');

gulp.task("dist", function () {
    return gulp.src(["./lib/*.js"])
        .pipe(babel({presets: ["es2015"]}))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest("dist"));
});

gulp.task("scripts", function () {
    return gulp.src(["./lib/*.js"])
        .pipe(babel({presets: ["es2015"]}))
        .pipe(gulp.dest("dist"));
});

gulp.task('watch', function() {
    gulp.watch("./lib/*.js", ['scripts']);
});

gulp.task("default", ["watch"]);
