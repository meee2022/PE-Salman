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
import type * as activityPlans from "../activityPlans.js";
import type * as adminImport from "../adminImport.js";
import type * as assignments from "../assignments.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as compliance from "../compliance.js";
import type * as coordinatorForms from "../coordinatorForms.js";
import type * as coverage from "../coverage.js";
import type * as deputyPrincipalForms from "../deputyPrincipalForms.js";
import type * as examArbitrationForms from "../examArbitrationForms.js";
import type * as examFollowupForms from "../examFollowupForms.js";
import type * as examForms from "../examForms.js";
import type * as interviews from "../interviews.js";
import type * as meetingForms from "../meetingForms.js";
import type * as newTeacherPlans from "../newTeacherPlans.js";
import type * as operationalPlans from "../operationalPlans.js";
import type * as permissions from "../permissions.js";
import type * as principalForms from "../principalForms.js";
import type * as profDevForms from "../profDevForms.js";
import type * as profLicenseForms from "../profLicenseForms.js";
import type * as remote from "../remote.js";
import type * as remotePeriods from "../remotePeriods.js";
import type * as reports from "../reports.js";
import type * as schools from "../schools.js";
import type * as settings from "../settings.js";
import type * as supervisors from "../supervisors.js";
import type * as teacherForms from "../teacherForms.js";
import type * as teachers from "../teachers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  activityPlans: typeof activityPlans;
  adminImport: typeof adminImport;
  assignments: typeof assignments;
  audit: typeof audit;
  auth: typeof auth;
  compliance: typeof compliance;
  coordinatorForms: typeof coordinatorForms;
  coverage: typeof coverage;
  deputyPrincipalForms: typeof deputyPrincipalForms;
  examArbitrationForms: typeof examArbitrationForms;
  examFollowupForms: typeof examFollowupForms;
  examForms: typeof examForms;
  interviews: typeof interviews;
  meetingForms: typeof meetingForms;
  newTeacherPlans: typeof newTeacherPlans;
  operationalPlans: typeof operationalPlans;
  permissions: typeof permissions;
  principalForms: typeof principalForms;
  profDevForms: typeof profDevForms;
  profLicenseForms: typeof profLicenseForms;
  remote: typeof remote;
  remotePeriods: typeof remotePeriods;
  reports: typeof reports;
  schools: typeof schools;
  settings: typeof settings;
  supervisors: typeof supervisors;
  teacherForms: typeof teacherForms;
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
