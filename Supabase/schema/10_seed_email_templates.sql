-- ============================================================
-- 10_seed_email_templates.sql
-- Seeds all 10 email templates: 5 categories × 2 types.
-- Depends on: 02_tables.sql, 01_extensions_enums.sql
--
-- Dollar-quoting ($T$...$T$) used for each html_body so that
-- apostrophes, single quotes, and HTML content need no escaping.
--
-- Placeholders resolved by the email Edge Function:
--   Contact data:  {{name}}, {{first_name}}, {{email}},
--                  {{message}}, {{category_label}},
--                  {{received_at}}, {{page}}
--   Brand config:  {{portfolio_url}}, {{whatsapp_number}},
--                  {{sender_name}}, {{sender_email}},
--                  {{github_url}}, {{facebook_url}},
--                  {{instagram_url}}, {{x_url}}, {{youtube_url}}
--
-- To update a template after deployment (no redeployment needed):
--   UPDATE public.email_templates
--   SET    html_body = $T$...new html...$T$, subject = '...'
--   WHERE  category  = 'new-website'
--   AND    "type"    = 'acknowledgement';
-- ============================================================

-- ── new-website · notification ────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'new-website',
    'notification',
    'New website project enquiry from {{name}}',
    'New website project enquiry from {{name}} ({{email}}). Category: {{category_label}}. Message: {{message}}. Received: {{received_at}}.',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New website project enquiry</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 6px;font-size:19px;font-weight:700;color:#EDF2F7;letter-spacing:-0.4px;font-family:'Helvetica Neue',Arial,sans-serif;">New website project enquiry</h1>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}} wants to build a new website for their business.</p>
<div style="background:rgba(240,160,48,0.1);border:1px solid rgba(240,160,48,0.25);border-radius:8px;padding:11px 14px;margin-bottom:20px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#F0A030;text-transform:uppercase;letter-spacing:1.2px;font-family:'Helvetica Neue',Arial,sans-serif;">Enquiry type</p><p style="margin:0;font-size:13px;font-weight:600;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{category_label}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr><td width="48%" style="vertical-align:top;padding-right:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From</p><p style="margin:0;font-size:13px;font-weight:600;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}}</p></div></td><td width="52%" style="vertical-align:top;padding-left:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Email</p><a href="mailto:{{email}}" style="font-size:12px;font-weight:600;color:#4A9EFF;word-break:break-all;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">{{email}}</a></div></td></tr></table>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Message</p><p style="margin:0;font-size:13px;color:#A8C0D6;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td width="50%" style="padding-right:6px;vertical-align:top;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:10px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Received</p><p style="margin:0;font-size:11px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">{{received_at}}</p></div></td><td width="50%" style="padding-left:6px;vertical-align:top;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:10px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From page</p><p style="margin:0;font-size:11px;color:#A8C0D6;word-break:break-all;font-family:'Helvetica Neue',Arial,sans-serif;">{{page}}</p></div></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" align="center" style="padding-right:5px;"><a href="mailto:{{email}}?subject=Re%3A%20Your%20website%20project%20%E2%80%94%20Godlove%20Tikum" style="display:block;background:#4A9EFF;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply by email</a></td><td width="50%" align="center" style="padding-left:5px;"><a href="https://wa.me/{{whatsapp_number}}?text=Hi%20{{name}}%2C%20" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply on WhatsApp</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Sent from your portfolio contact form &middot; <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── new-website · acknowledgement ────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'new-website',
    'acknowledgement',
    'Your website project enquiry — Godlove Tikum',
    'Hi {{first_name}}, your website project enquiry has been received. I will review it and reply with an outline, timeline, and price. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your website project enquiry</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Got it, {{first_name}}.</h1>
<p style="margin:0 0 14px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I have your enquiry about building a new website. I'll review it and come back to you with a clear outline of how I would approach it and what it would cost.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1.2px;font-family:'Helvetica Neue',Arial,sans-serif;">What happens next</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">01</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">I review your project details</span></td></tr><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">02</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">I reply with an outline, timeline and price</span></td></tr><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">03</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">We agree on the approach and get started</span></td></tr></table></div>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Reach me on WhatsApp if it's urgent.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── fix-website · notification ────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'fix-website',
    'notification',
    'Website fix enquiry from {{name}}',
    'Website fix enquiry from {{name}} ({{email}}). Message: {{message}}. Received: {{received_at}}.',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Website fix enquiry</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 6px;font-size:19px;font-weight:700;color:#EDF2F7;letter-spacing:-0.4px;font-family:'Helvetica Neue',Arial,sans-serif;">Website fix enquiry</h1>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}} says their website isn&rsquo;t getting them customers.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr><td width="48%" style="vertical-align:top;padding-right:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From</p><p style="margin:0;font-size:13px;font-weight:600;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}}</p></div></td><td width="52%" style="vertical-align:top;padding-left:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Email</p><a href="mailto:{{email}}" style="font-size:12px;font-weight:600;color:#4A9EFF;word-break:break-all;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">{{email}}</a></div></td></tr></table>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Message</p><p style="margin:0;font-size:13px;color:#A8C0D6;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td width="50%" style="padding-right:6px;vertical-align:top;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:10px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Received</p><p style="margin:0;font-size:11px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">{{received_at}}</p></div></td><td width="50%" style="padding-left:6px;vertical-align:top;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:10px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From page</p><p style="margin:0;font-size:11px;color:#A8C0D6;word-break:break-all;font-family:'Helvetica Neue',Arial,sans-serif;">{{page}}</p></div></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" align="center" style="padding-right:5px;"><a href="mailto:{{email}}?subject=Re%3A%20Your%20website%20%E2%80%94%20Godlove%20Tikum" style="display:block;background:#4A9EFF;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply by email</a></td><td width="50%" align="center" style="padding-left:5px;"><a href="https://wa.me/{{whatsapp_number}}?text=Hi%20{{name}}%2C%20" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply on WhatsApp</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Sent from your portfolio contact form &middot; <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── fix-website · acknowledgement ────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'fix-website',
    'acknowledgement',
    'Looking into your website — Godlove Tikum',
    'Hi {{first_name}}, your website fix enquiry has been received. I will review it and reply with a diagnosis and fix plan. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Looking into your website</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Message received, {{first_name}}.</h1>
<p style="margin:0 0 14px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;ll look at what you&rsquo;ve described and come back with a clear picture of what&rsquo;s likely going wrong and what it would take to fix it.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1.2px;font-family:'Helvetica Neue',Arial,sans-serif;">What happens next</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">01</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">I review what you&rsquo;ve described</span></td></tr><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">02</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">I reply with a diagnosis and what it would take to fix</span></td></tr><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">03</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">We agree on the approach and move forward</span></td></tr></table></div>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Share your website link on WhatsApp if you want faster feedback.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── book-call · notification ──────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'book-call',
    'notification',
    'Call request from {{name}}',
    'Call request from {{name}} ({{email}}). Message: {{message}}. Received: {{received_at}}.',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Call request</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 6px;font-size:19px;font-weight:700;color:#EDF2F7;letter-spacing:-0.4px;font-family:'Helvetica Neue',Arial,sans-serif;">Call request</h1>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}} wants to schedule a call.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr><td width="48%" style="vertical-align:top;padding-right:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From</p><p style="margin:0;font-size:13px;font-weight:600;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}}</p></div></td><td width="52%" style="vertical-align:top;padding-left:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Email</p><a href="mailto:{{email}}" style="font-size:12px;font-weight:600;color:#4A9EFF;word-break:break-all;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">{{email}}</a></div></td></tr></table>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Message</p><p style="margin:0;font-size:13px;color:#A8C0D6;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" align="center" style="padding-right:5px;"><a href="mailto:{{email}}?subject=Re%3A%20Your%20call%20request%20%E2%80%94%20Godlove%20Tikum" style="display:block;background:#4A9EFF;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Confirm by email</a></td><td width="50%" align="center" style="padding-left:5px;"><a href="https://wa.me/{{whatsapp_number}}?text=Hi%20{{name}}%2C%20" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Confirm on WhatsApp</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Sent from your portfolio contact form &middot; <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── book-call · acknowledgement ──────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'book-call',
    'acknowledgement',
    'Call request received — Godlove Tikum',
    'Hi {{first_name}}, your call request has been received. I will check my schedule and confirm a time shortly. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Call request received</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Call request received, {{first_name}}.</h1>
<p style="margin:0 0 14px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;ll check my schedule and get back to you with a time that works. Expect to hear from me within a few hours.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── project-question · notification ───────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'project-question',
    'notification',
    'Project question from {{name}}',
    'Project question from {{name}} ({{email}}). Message: {{message}}. Received: {{received_at}}.',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project question</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 6px;font-size:19px;font-weight:700;color:#EDF2F7;letter-spacing:-0.4px;font-family:'Helvetica Neue',Arial,sans-serif;">Project question</h1>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}} has a question about one of your projects.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr><td width="48%" style="vertical-align:top;padding-right:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From</p><p style="margin:0;font-size:13px;font-weight:600;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}}</p></div></td><td width="52%" style="vertical-align:top;padding-left:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Email</p><a href="mailto:{{email}}" style="font-size:12px;font-weight:600;color:#4A9EFF;word-break:break-all;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">{{email}}</a></div></td></tr></table>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Message</p><p style="margin:0;font-size:13px;color:#A8C0D6;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" align="center" style="padding-right:5px;"><a href="mailto:{{email}}?subject=Re%3A%20Your%20project%20question%20%E2%80%94%20Godlove%20Tikum" style="display:block;background:#4A9EFF;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply by email</a></td><td width="50%" align="center" style="padding-left:5px;"><a href="https://wa.me/{{whatsapp_number}}?text=Hi%20{{name}}%2C%20" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply on WhatsApp</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Sent from your portfolio contact form &middot; <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── project-question · acknowledgement ────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'project-question',
    'acknowledgement',
    'Question received — Godlove Tikum',
    'Hi {{first_name}}, your project question has been received. I will get back to you shortly. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Question received</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Got your question, {{first_name}}.</h1>
<p style="margin:0 0 14px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;ll get back to you shortly with a full answer. If you have more context to share, WhatsApp is the quickest way to reach me.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── other · notification ──────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'other',
    'notification',
    'New message from {{name}}',
    'New message from {{name}} ({{email}}). Message: {{message}}. Received: {{received_at}}.',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New message</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 6px;font-size:19px;font-weight:700;color:#EDF2F7;letter-spacing:-0.4px;font-family:'Helvetica Neue',Arial,sans-serif;">New message</h1>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}} sent you a message through the portfolio contact form.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr><td width="48%" style="vertical-align:top;padding-right:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">From</p><p style="margin:0;font-size:13px;font-weight:600;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{name}}</p></div></td><td width="52%" style="vertical-align:top;padding-left:6px;"><div style="background:#101F33;border:1px solid #1A2D42;border-radius:8px;padding:11px 13px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Email</p><a href="mailto:{{email}}" style="font-size:12px;font-weight:600;color:#4A9EFF;word-break:break-all;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">{{email}}</a></div></td></tr></table>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Message</p><p style="margin:0;font-size:13px;color:#A8C0D6;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" align="center" style="padding-right:5px;"><a href="mailto:{{email}}?subject=Re%3A%20Your%20message%20%E2%80%94%20Godlove%20Tikum" style="display:block;background:#4A9EFF;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply by email</a></td><td width="50%" align="center" style="padding-left:5px;"><a href="https://wa.me/{{whatsapp_number}}?text=Hi%20{{name}}%2C%20" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 16px;border-radius:100px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Reply on WhatsApp</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Sent from your portfolio contact form &middot; <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── other · acknowledgement ───────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'other',
    'acknowledgement',
    'Message received — Godlove Tikum',
    'Hi {{first_name}}, your message has been received. I will get back to you shortly. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Message received</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Message received, {{first_name}}.</h1>
<p style="margin:0 0 22px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;ll get back to you shortly.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #0BDA8A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1.2px;font-family:'Helvetica Neue',Arial,sans-serif;">What happens next</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">01</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">I read your message and understand what you need</span></td></tr><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">02</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">I reply by email &mdash; usually within a few hours</span></td></tr><tr><td style="padding:3px 0;"><span style="color:#0BDA8A;font-weight:700;font-size:12px;margin-right:10px;font-family:'Helvetica Neue',Arial,sans-serif;">03</span><span style="font-size:13px;color:#A8C0D6;font-family:'Helvetica Neue',Arial,sans-serif;">We figure out the best way forward together</span></td></tr></table></div>
<p style="margin:0 0 20px;font-size:13px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Reach me on WhatsApp if it&rsquo;s time-sensitive.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- reply + follow_up templates (admin → visitor)
-- ═══════════════════════════════════════════════════════════════

-- ── new-website · reply ────────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'new-website',
    'reply',
    'Re: Your website project — Godlove Tikum',
    'Hi {{first_name}}, here is my response to your website project enquiry. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re: Your website project</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Here&rsquo;s my proposal, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">Thank you for reaching out about your website project. I&rsquo;ve reviewed what you shared and I&rsquo;m ready to move forward. Here are my thoughts and next steps.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #4A6480;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Your message</p><p style="margin:0;font-size:13px;color:#4A6480;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── new-website · follow_up ────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'new-website',
    'follow_up',
    'Following up on your website project — Godlove Tikum',
    'Hi {{first_name}}, just following up on your website project enquiry. Are you still interested? WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Following up on your website project</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Just checking in, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I wanted to follow up on your website project enquiry. Are you still looking to get started? I&rsquo;d love to help — just reply here or reach out on WhatsApp.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── fix-website · reply ────────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'fix-website',
    'reply',
    'Re: Your website fix request — Godlove Tikum',
    'Hi {{first_name}}, here is my response to your website fix enquiry. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re: Your website fix request</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Here&rsquo;s what I found, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;ve reviewed the issue with your website and I&rsquo;m confident I can sort it out. Here&rsquo;s my diagnosis and what I&rsquo;d recommend.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #4A6480;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Your message</p><p style="margin:0;font-size:13px;color:#4A6480;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── fix-website · follow_up ────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'fix-website',
    'follow_up',
    'Following up on your website — Godlove Tikum',
    'Hi {{first_name}}, just following up on your website fix enquiry. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Following up on your website</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Just checking in, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;m following up on your website fix enquiry. Have you had a chance to consider my proposal? I&rsquo;m happy to jump on a quick call or answer any questions you have.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── book-call · reply ──────────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'book-call',
    'reply',
    'Re: Your call request — Godlove Tikum',
    'Hi {{first_name}}, here is my response to your call request. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re: Your call request</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Let&rsquo;s get on a call, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;ve checked my schedule and I&rsquo;m available. Reach me on WhatsApp to confirm a time that works for you, or reply to this email.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #4A6480;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Your message</p><p style="margin:0;font-size:13px;color:#4A6480;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── book-call · follow_up ──────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'book-call',
    'follow_up',
    'Following up on our call request — Godlove Tikum',
    'Hi {{first_name}}, just following up on your call request. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Following up on our call request</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Still want to jump on a call, {{first_name}}?</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;m following up on your call request. If you&rsquo;re still interested, I&rsquo;m available this week. Just send me a message and we&rsquo;ll find a time.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── project-question · reply ───────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'project-question',
    'reply',
    'Re: Your project question — Godlove Tikum',
    'Hi {{first_name}}, here is my answer to your project question. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re: Your project question</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Here&rsquo;s my answer, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">Thanks for your question about one of my projects. I&rsquo;m happy to go into more detail — here&rsquo;s everything I can share.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #4A6480;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Your question</p><p style="margin:0;font-size:13px;color:#4A6480;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── project-question · follow_up ──────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'project-question',
    'follow_up',
    'Following up on your question — Godlove Tikum',
    'Hi {{first_name}}, just following up on your project question. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Following up on your question</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Just checking in, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;m following up on the project question you sent. Did my answer help? Feel free to ask anything else — I&rsquo;m happy to go deeper on any part of it.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── other · reply ──────────────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'other',
    'reply',
    'Re: Your message — Godlove Tikum',
    'Hi {{first_name}}, here is my reply to your message. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Re: Your message</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Here&rsquo;s my reply, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">Thank you for reaching out. I&rsquo;ve had a chance to read your message and wanted to get back to you.</p>
<div style="background:#101F33;border:1px solid #1A2D42;border-left:3px solid #4A6480;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;"><p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#4A6480;text-transform:uppercase;letter-spacing:1px;font-family:'Helvetica Neue',Arial,sans-serif;">Your message</p><p style="margin:0;font-size:13px;color:#4A6480;line-height:1.78;white-space:pre-wrap;font-family:'Helvetica Neue',Arial,sans-serif;">{{message}}</p></div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;


-- ── other · follow_up ──────────────────────────────────────────
INSERT INTO public.email_templates (category, "type", subject, text_body, html_body) VALUES (
    'other',
    'follow_up',
    'Following up — Godlove Tikum',
    'Hi {{first_name}}, just following up on your message. WhatsApp: {{whatsapp_number}} — {{portfolio_url}}',
    $T$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Following up</title></head>
<body style="margin:0;padding:0;background:#0C1828;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0C1828;padding:28px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#07101F;border-radius:12px 12px 0 0;padding:20px 24px;border-bottom:2px solid #0BDA8A;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:700;color:#EDF2F7;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}}</p><p style="margin:3px 0 0;font-size:11px;color:#4A6480;font-family:'Helvetica Neue',Arial,sans-serif;">Full-stack web developer &middot; Bamenda, Cameroon</p></td><td align="right"><a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;font-size:11px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">{{portfolio_url}}</a></td></tr></table></td></tr>
<tr><td style="background:#07101F;padding:24px 24px 28px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#EDF2F7;letter-spacing:-0.5px;line-height:1.2;font-family:'Helvetica Neue',Arial,sans-serif;">Just checking in, {{first_name}}.</h1>
<p style="margin:0 0 20px;font-size:14px;color:#A8C0D6;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">I&rsquo;m following up on the message you sent. I&rsquo;m still happy to help — just let me know if you have any questions or need anything else from me.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td align="center"><a href="https://wa.me/{{whatsapp_number}}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;font-family:'Helvetica Neue',Arial,sans-serif;">WhatsApp &mdash; {{whatsapp_number}}</a></td></tr></table>
</td></tr>
<tr><td style="background:#040B14;border-radius:0 0 12px 12px;padding:14px 24px;border-top:1px solid #1A2D42;"><p style="margin:0 0 4px;font-size:11px;color:#4A6480;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">{{sender_name}} &middot; Web Developer &middot; Bamenda, Cameroon</p><p style="margin:0;font-size:10px;color:#2A3D52;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">You received this because you submitted the contact form at <a href="{{portfolio_url}}" style="color:#0BDA8A;text-decoration:none;">{{portfolio_url}}</a></p></td></tr>
</table></td></tr></table>
</body></html>$T$
) ON CONFLICT (category, "type") DO NOTHING;
