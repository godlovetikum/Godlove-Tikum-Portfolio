/**
 * email/index.ts
 *
 * HTTP entry point for the email Edge Function.
 * Reads caller & action from url query parameters.
 *
 * Route table:
 *
 *   POST  caller=trigger &
 *         action=alert              — DB webhook fires on contacts INSERT.
 *                                     Reads Authorization: Bearer <TRIGGER_KEY>.
 *
 *   POST  caller=manual &
 *         action=send               — Admin dashboard send emails.
 *                                     Requires admin JWT.
 *
 *   POST  caller=manual &
 *         action=retry              — Retry a failed outbound email (same
 *                                     handler as send). Requires admin JWT.
 *
 *   POST  caller=manual &
 *         action=template           — Create a new email template (admin JWT).
 *
 *   GET   action=templates          — List all email templates (admin JWT).
 *   GET   action=template           — Get single template by ?id= (admin JWT).
 *   GET   action=outbound           — List outbound_emails records (admin JWT).
 *
 *   PATCH                           — Update a template's subject / html_body (admin JWT).
 */

import { handleError }                         from '../_shared/response.ts';
import { Errors }                              from '../_shared/errors.ts';
import { verifyAdminAuth, verifyTriggerAuth }  from '../_shared/auth.ts';
import { getTemplates, getOneTemplate }        from './handlers/get_templates.ts';
import { handlePatchTemplate }                 from './handlers/handle_patch_template.ts';
import { createEmailTemplate }                 from './handlers/create_template.ts';
import { sendByAlertTrigger }                  from './handlers/trigger.ts';
import { sendManualEmail }                     from './handlers/send_manual.ts';
import { handleGetOutboundEmails }             from './handlers/get_outbound_emails.ts';
import { validate }                            from '../_shared/validators.ts';


const allowedActions = ['alert', 'template', 'templates', 'send', 'outbound', 'retry'];

Deno.serve(async (req: Request): Promise<Response> => {
    try {
        const url    = new URL(req.url);
        const action = validate.getAction(url, allowedActions);
        const caller = validate.getParam(url, 'caller', false);

        switch (req.method) {

            case 'POST': {

                if (action === 'alert' && caller === 'trigger') {
                    await verifyTriggerAuth(req);
                    return await sendByAlertTrigger(req);
                }

                if (action === 'template' && caller === 'manual') {
                    await verifyAdminAuth(req);
                    return await createEmailTemplate(req);
                }

                if (action === 'send' && caller === 'manual') {
                    await verifyAdminAuth(req);
                    return await sendManualEmail(req);
                }

                if (action === 'retry' && caller === 'manual') {
                    await verifyAdminAuth(req);
                    return await sendManualEmail(req);
                }

                throw Errors.validation.invalidCaller();
            }

            case 'GET': {
                await verifyAdminAuth(req);

                if (action === 'templates') {
                    return await getTemplates(req);
                }

                if (action === 'template') {
                    return await getOneTemplate(req);
                }

                if (action === 'outbound') {
                    return await handleGetOutboundEmails(req);
                }

                throw Errors.validation.invalidInput('action', 'Accepted: templates, template, outbound.');
            }

            case 'PATCH': {
                await verifyAdminAuth(req);
                const body: Record<string, unknown> = await validate.parseReqBody(req);
                return await handlePatchTemplate(body);
            }

            default:
                throw Errors.server.methodNotAllowed();
        }
    } catch (err) {
        return handleError(err);
    }
});
