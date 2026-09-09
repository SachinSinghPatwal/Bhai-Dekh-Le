import { ApiError } from "./ApiError.js";
import { Request } from "express";
export default function endpointRequestBodyValidation(
  req:Request,
):object {
  try {
    const { ...params }: ReadableStream<Uint8Array<ArrayBuffer>> | null | undefined =
      req.body;

    const properties: unknown[] = Object.values(params);

    console.log("properties", properties);

    const hasEmptyField = properties.some(
      (field) => typeof field !== "string" || field.trim() === "",
    );

    if (hasEmptyField) {
      throw new ApiError(400, "All fields are required");
    }
    
    return properties
  } catch (error: unknown) {
    throw new ApiError(
      500,
      `Something went wrong while validating params -- ${error}`,
    );
  }
}
