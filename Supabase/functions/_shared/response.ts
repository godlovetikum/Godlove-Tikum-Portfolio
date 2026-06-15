/**
 * _shared/response.ts
 *
 * Centralised response builders used by every Edge Function.
 * Every response — success or failure — uses the same shape:
 *
 *   Success: { success: true,  data: { message, ...fields }, error: null }
 *   Failure: { success: false, data: null, error: { code, message } }
 */

import { AppError, Errors } from './errors.ts';



/**
 * Builds a JSON success response.
 * @param data   Object containing at minimum a `message` string plus any
 *               additional fields to return to the caller.
 * @param status HTTP status code. Defaults to 200.
 */
export function successResponse(
    data:   { message: string; [key: string]: unknown },
    status: number = 200,
): Response {
    return new Response(
        JSON.stringify({ success: true, data, error: null }),
        { status, headers: { 'Content-Type': 'application/json' } }
    );
}



/**
 * Builds a JSON error response from an AppError instance.
 * HTTP status is taken from the AppError.
 * @param error An AppError instance from the Errors catalogue.
 */
export function errorResponse(error: AppError): Response {
    return new Response(
        JSON.stringify({
            success: false,
            data:    null,
            error:   { code: error.code, message: error.message },
        }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
    );
}


/**
 * Catch-all for every Edge Function's top-level try/catch.
 * Known AppErrors are returned as-is. Anything else is logged
 * server-side and mapped to the generic unexpected error.
 * @param caught The value caught in a catch block (typed as unknown).
 */
export function handleError(caught: unknown): Response {
    if (caught instanceof AppError) {
        console.error(caught);
        return errorResponse(caught);
    }
    console.error('[handleError] Unexpected error:', caught);
    return errorResponse(Errors.server.unexpected());
}
