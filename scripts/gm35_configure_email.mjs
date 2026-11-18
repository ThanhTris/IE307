import { readFile } from 'node:fs/promises';

const sender = 'uit.gicungduoc@gmail.com';

async function main(args) {
  const apply = args.length === 1 && args[0] === '--apply';
  if (args.length && !apply) throw new Error('Usage: node scripts/gm35_configure_email.mjs [--apply]');

  const template = await readFile(new URL('../supabase/templates/account-code.html', import.meta.url), 'utf8');
  if (!template.includes('{{ .Token }}')) throw new Error('The Auth email template must include the OTP token.');
  const config = {
    external_email_enabled: true,
    mailer_autoconfirm: false,
    mailer_allow_unverified_email_sign_ins: false,
    mailer_otp_length: 6,
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: sender,
    smtp_admin_email: sender,
    smtp_sender_name: 'Gì Cũng Được',
    mailer_subjects_confirmation: 'Xác minh email · Gì Cũng Được',
    mailer_subjects_recovery: 'Đặt lại mật khẩu · Gì Cũng Được',
    mailer_templates_confirmation_content: template,
    mailer_templates_recovery_content: template,
  };

  if (!apply) {
    console.log(JSON.stringify({ mode: 'preview', config }, null, 2));
    return;
  }

  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const appPassword = process.env.GM35_GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (!ref || !/^[a-z0-9]+$/.test(ref)) throw new Error('Set SUPABASE_PROJECT_REF to the target project reference.');
  if (!token || !appPassword) throw new Error('Set SUPABASE_ACCESS_TOKEN and GM35_GMAIL_APP_PASSWORD before applying.');

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...config, smtp_pass: appPassword }),
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  }).catch(() => { throw new Error('Could not reach the Supabase Management API.'); });
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Supabase rejected the Auth update (HTTP ${response.status}).`);
  console.log(`Supabase accepted the Gmail SMTP and OTP configuration for ${ref}.`);
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
