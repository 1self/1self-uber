var gulp = require('gulp');
var babel = require('gulp-babel');
var env = require('gulp-env');
var exec = require('child_process').exec;

gulp.task('default', function () {
	//Do nothing
});

gulp.task('build', function () {
    return gulp.src('src/**/*.js')
        .pipe(babel())
        .pipe(gulp.dest('dist'));
});

gulp.task('serve', ['build'], function (cb) {
  exec('foreman start', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
})