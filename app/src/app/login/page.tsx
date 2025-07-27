import LoginPageWithSuspense from '@/components/login-page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LoginRoute() {
    return <LoginPageWithSuspense />;
}
