/**
 * analytics/handle_get.ts
 *
 * Returns analytics data for the admin dashboard.
 *
 * Query params:
 *   view  = "summary" (default) | "trend" | "raw"
 *   table = "visitors" | "clicks"  (required for raw view only)
 *   from, to  = ISO date strings for date range filtering
 *   page, limit = pagination (raw view only)
 *
 * view=summary → calls get_analytics_summary() RPC
 *                Response shape: { message, summary: {...} }
 *
 * view=trend   → calls get_analytics_daily_trend() RPC
 *                Response shape: { message, trend: [...] }
 *
 * view=raw     → paginated raw rows from analytics_visitors or analytics_clicks
 *                Response shape: { message, view, table, rows, total, page, limit }
 */

import { successResponse } from '../../_shared/response.ts';
import { Errors }        from '../../_shared/errors.ts';
import { validate }       from '../../_shared/validators.ts';
import { db }               from '../../_shared/db.ts';


export async function handleGet(req: Request): Promise<Response> {
    const { view, table, from, to, page, limit } =
        validate.analyticsGetParams(new URL(req.url));

    if (view === 'summary') {
        const summary = await db.analytics.fetchSummary({ from, to });
        return successResponse({
            message: 'Analytics summary retrieved.',
            analytics: { view, summary}
        });
    }

    if (view === 'trend') {
        const trend = await db.analytics.fetchDailyTrend({ from, to });
        return successResponse({
            message: `${(trend as unknown[]).length} day(s) of trend data returned.`,
            analytics: { view, trend }
        });
    }

    if (view === 'raw') {
        if (table !== 'visitors' && table !== 'clicks') {
            throw Errors.validation.invalidInput('table', 'Must be "visitors" or "clicks".')                
        }

        const filters = { from, to, page, limit };
        const { rows, total } = table === 'visitors'
            ? await db.analytics.fetchVisitorRaw(filters)
            : await db.analytics.fetchClickRaw(filters);

        return successResponse({
            message: `${rows.length} row(s) returned.`,
            analytics: { view, table, rows, total, page, limit  }
        });
    }

    throw Errors.validation.invalidInput('view', 'Must be "summary", "trend", or "raw".');
}
