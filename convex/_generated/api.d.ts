/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as assignments from "../assignments.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as compliance from "../compliance.js";
import type * as coordinatorForms from "../coordinatorForms.js";
import type * as coverage from "../coverage.js";
import type * as interviews from "../interviews.js";
import type * as permissions from "../permissions.js";
import type * as remote from "../remote.js";
import type * as remotePeriods from "../remotePeriods.js";
import type * as schools from "../schools.js";
import type * as settings from "../settings.js";
import type * as supervisors from "../supervisors.js";
import type * as teachers from "../teachers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  assignments: typeof assignments;
  audit: typeof audit;
  auth: typeof auth;
  compliance: typeof compliance;
  coordinatorForms: typeof coordinatorForms;
  coverage: typeof coverage;
  interviews: typeof interviews;
  permissions: typeof permissions;
  remote: typeof remote;
  remotePeriods: typeof remotePeriods;
  schools: typeof schools;
  settings: typeof settings;
  supervisors: typeof supervisors;
  teachers: typeof teachers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
