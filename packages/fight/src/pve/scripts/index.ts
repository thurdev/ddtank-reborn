/** Loads every PvE script (transpiled donor scripts, then manual overrides). Import once on the server. */
import "./generated/index.js";
import "./manual/index.js";
export { listScripts, scriptInfo } from "../script.js";
