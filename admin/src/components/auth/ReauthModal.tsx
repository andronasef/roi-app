import { GoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';

export type AuthErrorKind = 'allowlist' | 'invalid' | 'network';

export interface ReauthModalProps {
  open: boolean;
  submitting: boolean;
  error: AuthErrorKind | null;
  onCredential: (credential: string) => void;
}

/** Blocking in-page re-auth (D-03). Rendered as a sibling of the app so editor state never unmounts. */
export function ReauthModal({ open, submitting, error, onCredential }: ReauthModalProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} dismissible={false}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.cta.signInGoogle}</DialogTitle>
          <DialogDescription>{t.errors.sessionExpired401}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="mt-4 text-start text-sm font-bold text-destructive">
            {error === 'allowlist'
              ? t.errors.allowlist403
              : error === 'network'
                ? t.errors.networkFailure
                : t.errors.sessionExpired401}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center">
          {submitting ? (
            <Button loading disabled>
              {t.cta.signInGoogle}
            </Button>
          ) : (
            <GoogleLogin
              onSuccess={(res) => {
                if (res.credential) onCredential(res.credential);
              }}
              onError={() => undefined}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
