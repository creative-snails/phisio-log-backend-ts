"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_CHAR_LONG = exports.MAX_CHAR_MEDIUM = exports.MAX_CHAR_SHORT = exports.SEVERITY_TYPES = exports.IMPROVEMENT_STATUS = exports.STATUS_TYPES = void 0;
exports.maxValidationMessage = maxValidationMessage;
exports.minValidationMessage = minValidationMessage;
exports.STATUS_TYPES = ["open", "closed", "in-progress"];
exports.IMPROVEMENT_STATUS = ["improving", "stable", "worsening", "variable"];
exports.SEVERITY_TYPES = ["mild", "moderate", "severe", "variable"];
exports.MAX_CHAR_SHORT = 100;
exports.MAX_CHAR_MEDIUM = 1000;
exports.MAX_CHAR_LONG = 10000;
function maxValidationMessage(item, max) {
    return `${item} must be less than ${max} characters`;
}
function minValidationMessage(item, min) {
    return `${item} should be more than ${min} characters`;
}
