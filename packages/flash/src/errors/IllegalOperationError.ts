/** `flash.errors.IllegalOperationError` */
import { $class } from "../as3";

export class IllegalOperationError extends Error {
  errorID: number;
  constructor(message = "", id = 0) {
    super(message);
    this.name = "IllegalOperationError";
    this.errorID = id;
  }
}
$class(IllegalOperationError, "flash.errors.IllegalOperationError");
