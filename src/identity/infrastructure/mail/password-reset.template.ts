import { OTP_EXPIRY_MINUTES } from 'src/shared/constants';
import { mailLayout } from './mail-layout';

export function passwordResetCodeTemplate(code: string): string {
  return mailLayout(
    'Réinitialisation du mot de passe',
    `
        <p>Bonjour,</p>
        <p>Voici votre code pour choisir un nouveau mot de passe :</p>
        <span class="otp">${code}</span>
        <p class="muted">Ce code est valable ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p class="muted">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : votre mot de passe ne change pas.</p>`,
  );
}

export function passwordChangedTemplate(): string {
  return mailLayout(
    'Mot de passe modifié',
    `
        <p>Bonjour,</p>
        <p>Le mot de passe de votre compte Music Room vient d'être modifié.</p>
        <p class="muted">Si vous n'êtes pas à l'origine de ce changement, demandez immédiatement un nouveau code depuis l'application pour reprendre la main sur votre compte.</p>`,
  );
}
