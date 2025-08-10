// karma.conf.cjs — Angular 20 + Karma/Jasmine
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'), // ← correct plugin
    ],
    client: { clearContext: false },
    reporters: ['progress', 'kjhtml'],
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    browsers: ['Chrome'],          // or 'ChromeHeadless'
    autoWatch: true,
    singleRun: false,
    restartOnFileChange: true,
  });
};
