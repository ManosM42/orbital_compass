/**
 * satellite.js re-export shim.
 *
 * The package's root entry also re-exports its experimental WASM runtime,
 * which ships a pthreads bundle using top-level await. That form cannot be
 * bundled into the worker/iife output used by the production build. We only
 * ever use the pure-JS SGP4 API, so we import those modules directly and
 * keep the WASM runtime out of the graph entirely.
 */

export * as constants from "../../node_modules/satellite.js/dist/constants.js";
export { jday, invjday } from "../../node_modules/satellite.js/dist/ext.js";
export { twoline2satrec, json2satrec } from "../../node_modules/satellite.js/dist/io.js";
export { propagate, sgp4, gstime } from "../../node_modules/satellite.js/dist/propagation.js";
export { dopplerFactor } from "../../node_modules/satellite.js/dist/dopplerFactor.js";
export {
  radiansToDegrees,
  degreesToRadians,
  degreesLat,
  degreesLong,
  radiansLat,
  radiansLong,
  geodeticToEcf,
  eciToGeodetic,
  eciToEcf,
  ecfToEci,
  ecfToLookAngles,
} from "../../node_modules/satellite.js/dist/transforms.js";
export { sunPos } from "../../node_modules/satellite.js/dist/sun.js";
export { shadowFraction } from "../../node_modules/satellite.js/dist/shadow.js";
export type { SatRec } from "../../node_modules/satellite.js/dist/propagation/SatRec.js";
