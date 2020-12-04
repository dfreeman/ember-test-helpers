import Ember from 'ember';

/**
  Checks if the currently running Ember version is greater than or equal to the
  specified major and minor version numbers.

  @private
  @param {number} major the major version number to compare
  @param {number} minor the minor version number to compare
  @returns {boolean} true if the Ember version is >= MAJOR.MINOR specified, false otherwise
*/
export default function hasEmberVersion(major: number, minor: number): boolean {
  let numbers = Ember.VERSION.split('-')[0].split('.');
  let actualMajor = parseInt(numbers[0], 10);
  let actualMinor = parseInt(numbers[1], 10);
  return actualMajor > major || (actualMajor === major && actualMinor >= minor);
}
