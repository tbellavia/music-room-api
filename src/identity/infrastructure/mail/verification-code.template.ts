import { OTP_EXPIRY_MINUTES } from 'src/shared/constants';
import { mailLayout } from './mail-layout';

export function verificationCodeTemplate(code: string): string {
  return mailLayout(
    'Code de validation',
    `
        <p>Bonjour,</p>
        <p>Voici votre code de validation :</p>
        <span class="otp">${code}</span>
        <p class="muted">Ce code est valable ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p class="muted">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>`,
  );
}
