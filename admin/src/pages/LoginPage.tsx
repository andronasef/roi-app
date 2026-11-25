import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';

export function LoginPage() {
  const { t, dir, lang, toggleLang } = useI18n();
  const { isLoading, googleClientId, authError, loginWithCredential, retryBoot } = useAuth();

  const errorCopy =
    authError === 'allowlist'
      ? t.errors.allowlist403
      : authError === 'network'
        ? t.errors.networkFailure
        : authError === 'notConfigured'
          ? t.errors.googleNotConfigured
          : authError === 'invalid'
            ? t.errors.sessionExpired401
            : null;

  return (
    <main
      dir={dir}
      lang={lang}
      className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-start">
          <CardTitle>{t.appName}</CardTitle>
          <CardDescription>{t.appSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errorCopy ? (
            <p role="alert" className="text-start text-sm font-bold text-destructive">
              {errorCopy}
            </p>
          ) : null}
          <div className="flex justify-center">
            {isLoading ? (
              <Skeleton data-testid="login-skeleton" className="h-11 w-full" />
            ) : googleClientId ? (
              <GoogleLogin
                onSuccess={(res) => {
                  if (res.credential) void loginWithCredential(res.credential);
                }}
                onError={() => undefined}
              />
            ) : (
              <Button variant="outline" onClick={retryBoot}>
                {t.cta.retryRequest}
              </Button>
            )}
          </div>
          {authError === 'network' && googleClientId ? (
            <Button variant="outline" onClick={retryBoot}>
              {t.cta.retryRequest}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={toggleLang}>
            {t.nav.switchLanguage}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
