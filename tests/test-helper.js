/* globals Testem */
import QUnit from 'qunit';
import { registerDeprecationHandler } from '@ember/debug';
import AbstractTestLoader from 'ember-cli-test-loader/test-support/index';
import Ember from 'ember';
import { isSettled, getSettledState } from '@ember/test-helpers';
import { _backburner } from '@ember/runloop';
import './helpers/resolver';

import PromisePolyfill from '@ember/test-helpers/-internal/promise-polyfill';

// This is needed for async/await transpilation :sob:
if (typeof Promise === 'undefined') {
  window.Promise = PromisePolyfill;
}

if (QUnit.config.seed) {
  QUnit.config.reorder = false;
}

let moduleLoadFailures = [];
let cleanupFailures = [];
let asyncLeakageFailures = [];

_backburner.DEBUG = true;

QUnit.done(function () {
  if (moduleLoadFailures.length) {
    throw new Error('\n' + moduleLoadFailures.join('\n'));
  }

  if (cleanupFailures.length) {
    throw new Error('\n' + cleanupFailures.join('\n'));
  }

  if (asyncLeakageFailures.length) {
    throw new Error('\n' + asyncLeakageFailures.join('\n'));
  }
});

class TestLoader extends AbstractTestLoader {
  moduleLoadFailure(moduleName, error) {
    moduleLoadFailures.push(error);

    QUnit.module('TestLoader Failures');
    QUnit.test(moduleName + ': could not be loaded', function () {
      throw error;
    });
  }
}

new TestLoader().loadModules();

let deprecations;
registerDeprecationHandler((message, options, next) => {
  // in case a deprecation is issued before a test is started
  if (!deprecations) {
    deprecations = [];
  }

  deprecations.push(message);
  next(message, options);
});

QUnit.testStart(function () {
  deprecations = [];
});

QUnit.testDone(function ({ module, name }) {
  // ensure no test accidentally change state of run.backburner.DEBUG
  if (_backburner.DEBUG !== true) {
    let message = `backburner.DEBUG should be reset (to true) after test has completed. ${module}: ${name} did not.`;
    cleanupFailures.push(message);

    // eslint-disable-next-line
    console.error(message);
    _backburner.DEBUG = true;
  }

  // this is used to ensure that no tests accidentally leak `Ember.testing` state
  if (Ember.testing) {
    let message = `Ember.testing should be reset after test has completed. ${module}: ${name} did not reset Ember.testing`;
    cleanupFailures.push(message);

    // eslint-disable-next-line
    console.error(message);
    Ember.testing = false;
  }

  if (!isSettled()) {
    let message = `Expected to be settled after ${module}: ${name}, but was \`${JSON.stringify(
      getSettledState()
    )}\``;
    asyncLeakageFailures.push(message);

    // eslint-disable-next-line
    console.error(message);
  }
});

QUnit.assert.noDeprecations = function (callback) {
  let originalDeprecations = deprecations;
  deprecations = [];

  callback();
  this.deepEqual(deprecations, [], 'Expected no deprecations during test.');

  deprecations = originalDeprecations;
};

QUnit.assert.deprecations = function (callback, expectedDeprecations) {
  let originalDeprecations = deprecations;
  deprecations = [];

  callback();
  this.deepEqual(deprecations, expectedDeprecations, 'Expected deprecations during test.');

  deprecations = originalDeprecations;
};

QUnit.assert.deprecationsInclude = function (expected) {
  this.pushResult({
    result: deprecations.indexOf(expected) > -1,
    actual: deprecations,
    message: `expected to find \`${expected}\` deprecation`,
  });
};

QUnit.start();

if (typeof Testem !== 'undefined') {
  Testem.hookIntoTestFramework();
}
