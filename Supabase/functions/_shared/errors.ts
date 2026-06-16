/**
 * _shared/errors.ts
 *
 * AppError — typed error carrying a static code, HTTP status, and a
 * user/admin-facing message that describes what went wrong and what to do next.
 *
 * Errors — nested factory catalogue. Every error in the system is defined here.
 * Functions throw Errors.namespace.factory() rather than constructing AppErrors
 * directly, keeping codes consistent and messages contextual.
 *
 * Usage:
 *   throw Errors.auth.unauthorized();
 *   throw Errors.validation.missingField('email');
 *   throw Errors.config.missing('gas_email_url');
 */


// ── AppError ──────────────────────────────────────────────────────────────────

export class AppError extends Error {
    readonly code:   string;
    readonly status: number;

    constructor(code: string, message: string, status: number) {
        super(message);
        this.name   = 'AppError';
        this.code   = code;
        this.status = status;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}


// ── Errors catalogue ──────────────────────────────────────────────────────────

export const Errors = {

    // ── Auth ──────────────────────────────────────────────────────
    auth: {
        unauthorized: () => new AppError(
            'auth.unauthorized',
            'Unauthorized. You do not have permission to perform this operation.',
            401
        ),

        invalidCredential: () => new AppError(
            'auth.invalid_credentials',
            'The email or password you entered is incorrect. Please check and try again',
            400
        ),

        userNotFound: () => new AppError(
            'auth.user_not_found',
            'No account exist with this email. Check and try again.',
            404
        ),

        forbidden: () => new AppError(
            'auth.forbidden',
            'Your account does not have permission to perform this action. Admin access is required.',
            403
        ),

        sessionExpired: () => new AppError(
            'auth.session_expired',
            'Your session has expired. Please sign in again to continue.',
            401
        ),

        invalidToken: () => new AppError(
            'auth.invalid_token',
            'The authorization token is invalid or could not be verified. Please sign in again.',
            401
        ),

        /** Used only by the Cloudflare Pages layer to detect a missing session cookie. Not raised by Edge Functions. */
        noCookie: () => new AppError(
            'auth.no_cookie',
            'No session cookie found. Please sign in to continue.',
            401
        ),
    },

    // ── Validation ────────────────────────────────────────────────
    validation: {
        missingField: (field: string) => new AppError(
            'validation.missing_field',
            `The "${field}" field is required and cannot be empty.`,
            400
        ),
        invalidInput: (field: string, detail?: string) => new AppError(
            'validation.invalid_input',
            detail
                ? `The "${field}" value is not valid: ${detail}`
                : `The "${field}" field contains an invalid value. Check the format and try again.`,
            400
        ),
        invalidEmail: () => new AppError(
            'validation.invalid_email',
            'This is not a valid email address. Check the format and try again.',
            400
        ),
        messageTooShort: () => new AppError(
            'validation.message_too_short',
            'The message is too short. Please write at least 20 characters.',
            400
        ),
        messageTooLong: () => new AppError(
            'validation.message_too_long',
            'The message is too long. Please keep it under 2000 characters.',
            400
        ),
        invalidCategory: () => new AppError(
            'validation.invalid_category',
            'The selected category is not recognised. Please choose from the available options.',
            400
        ),
        missingCaller: () => new AppError(
            'validation.missing_caller',
            'The "caller" field is required to identify the request context.',
            400
        ),
        invalidCaller: () => new AppError(
            'validation.invalid_caller',
            'The "caller" value is not recognised. Accepted values are: trigger, manual.',
            400
        ),
        invalidEmailType: () => new AppError(
            'validation.invalid_email_type',
            'The "type" value is not valid for this context. ' +
            'Use "notification", "acknowledgement", "both", or "standalone".',
            400
        ),
        missingEmailBody: () => new AppError(
            'validation.missing_email_body',
            'At least one of "html_body" or "text_body" is required to send an email.',
            400
        ),
        standaloneRequiresRecipient: () => new AppError(
            'validation.standalone_requires_recipient',
            'A standalone email requires a "to" address.',
            400
        ),
        contactReplyRequiresType: () => new AppError(
            'validation.contact_reply_requires_type',
            'A contact reply requires a "type" field: "notification", "acknowledgement", or "both".',
            400
        ),
    },

    // ── Contact ───────────────────────────────────────────────────
    contact: {
        insertFailed: () => new AppError(
            'contact.insert_failed',
            'Your message could not be saved. Please try again, or reach out directly via WhatsApp or email.',
            502
        ),
        notFound: () => new AppError(
            'contact.not_found',
            'No contact record was found with that ID. It may have been deleted or the ID is incorrect.',
            404
        ),
        updateFailed: () => new AppError(
            'contact.update_failed',
            'The contact record could not be updated. Please try again.',
            502
        ),
    },

    // ── Email ──────────────────────────────────────────────────────
    email: {
        notificationFailed: () => new AppError(
            'email.notification_failed',
            'The notification email to the admin could not be sent. ' +
            'The contact has been saved — retry from the dashboard when ready.',
            502
        ),
        acknowledgementFailed: () => new AppError(
            'email.acknowledgement_failed',
            'The acknowledgement email to the visitor could not be sent. ' +
            'The contact has been saved — retry from the dashboard when ready.',
            502
        ),
        sendFailed: (type: string) => new AppError(
            'email.send_failed',
            `The "${type}" email could not be sent. Check the provider configuration and brand config and try again.`,
            502
        ),
        templateNotFound: (category: string, type: string) => new AppError(
            'email.template_not_found',
            `No email template found for category "${category}" and type "${type}". ` +
            'Add the missing row in the email_templates table and try again.',
            404
        ),
        invalidCategoryOrType: () => new AppError(
            'template.invalid_category_or_type',
            'The specified email template category or type is invalid. Check and try again.',
            400
        ),
        templateAlreadyExist: () => new AppError(
            'template.already_exists',
            'An email template for this category/type already exists. Either update it or delete before retrying.',
            409
        ),
        invalidEmailDomain: (detail?: string) => new AppError(
            'validation.invalid_email_domain',
            detail ?? 'The provided email does not appear to accept mail. ' +
            'Please check the address and try again.',
            400
        ),
        outboundInsertFailed: () => new AppError(
            'email.outbound_insert_failed',
            'The outbound email record could not be created. The send will proceed but may not be tracked.',
            502
        ),
    },

    // ── Analytics ─────────────────────────────────────────────────
    analytics: {
        invalidPayload: () => new AppError(
            'analytics.invalid_payload',
            'The provided payload does not match the expected format.',
            400
        ),
        insertFailed: () => new AppError(
            'analytics.insert_failed',
            'The analytics event could not be recorded. The main flow was not affected.',
            502
        ),
        queryFailed: () => new AppError(
            'analytics.query_failed',
            'Analytics data could not be retrieved. Please try again.',
            502
        ),
    },

    // ── Config ────────────────────────────────────────────────────
    config: {
        missing: (key: string) => new AppError(
            'config.missing',
            `Required configuration key "${key}" is not set. ` +
            'Add it to the brand_config table in Supabase and try again.',
            500
        ),
        invalid: (key: string) => new AppError(
            'config.invalid',
            `The configuration value for "${key}" is still a placeholder. ` +
            'Update it in the brand_config table and try again.',
            500
        ),
        keyNotFound: () => new AppError(
            'config.key_not_found',
            'The specified brand config key does not exist. Check and try again' +
            ' or add it to the brand_config table',
            404
        ),
        keyAlreadyExists: () => new AppError(
            'config.key_already_exist',
            'A brand config entry with this key already exists. Use PATCH to update it.',
            409
        ),
    },

    // ── Database ──────────────────────────────────────────────────
    db: {
        queryFailed: () => new AppError(
            'db.query_failed',
            'A database operation failed. Please try again. ' +
            'If the problem persists, check the Supabase project logs.',
            500
        ),
        connectionFailed: () => new AppError(
            'db.connection_failed',
            'Could not connect to the database. Please try again later.',
            503
        ),
    },

    // ── Server ────────────────────────────────────────────────────
    server: {
        unexpected: () => new AppError(
            'server.unexpected_error',
            'An unexpected error occurred. Please try again. If it continues, Please reach out vaia email or WhatsApp.',
            500
        ),
        methodNotAllowed: () => new AppError(
            'server.method_not_allowed',
            'This endpoint does not accept that HTTP method.',
            405
        ),
    },
};



export const PGErrorMap: Record<string, () => AppError> = {
    'auth.unauthorized':              Errors.auth.unauthorized,
    'auth.forbidden':                 Errors.auth.forbidden,
    'auth.user_not_found':            Errors.auth.userNotFound,
    'auth.invalid_credentials':       Errors.auth.invalidCredential,
    'auth.invalid_token':             Errors.auth.invalidToken,
    'auth.session_expired':           Errors.auth.sessionExpired,
    'template.invalid_category_or_type': Errors.email.invalidCategoryOrType,
    'template.already_exists':         Errors.email.templateAlreadyExist,
    'config.key_not_found':           Errors.config.keyNotFound,
    'config.key_already_exist':       Errors.config.keyAlreadyExists,
};
